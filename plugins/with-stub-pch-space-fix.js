const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * Lets Android Studio sync (and its C++ indexer) work when the project path contains a space
 * (this project lives in "D:\React Native\OneTouchReview").
 *
 * expo-modules-core (57.0.21) registers `generateStubPCH` as a dependency of
 * `prepareKotlinBuildScriptModel`, the task Android Studio runs on every sync. It writes small
 * stub precompiled headers so the IDE's C++ engine can index the module; the real build compiles
 * the proper PCH through ninja. But it rebuilds the clang command by splitting on spaces
 * (`cmd.split(" ")`) and matching paths with `[^\s]+`, so a quoted path with a space is cut in
 * two ("no such file or directory: 'D:\React D:/React Native/…'") and the whole sync fails.
 * Simply skipping the task fixes the sync but leaves the IDE with a
 * "C/C++ Configuration Problem" for expo-modules-core.
 *
 * So, only when the path contains a space, the original task is disabled and replaced by the
 * same logic with a tokenizer that understands the double quotes CMake puts around such paths.
 * Mapping a drive letter (subst) or a junction doesn't help: Node resolves them back to the real
 * path. Remove this plugin once expo-modules-core quotes its arguments.
 *
 * Lives in a config plugin because android/ is generated and gitignored (prebuild erases edits).
 */

const MARKER = '// [with-stub-pch-space-fix]';

const SNIPPET = `
${MARKER} expo-modules-core's generateStubPCH breaks on paths with spaces (see plugins/with-stub-pch-space-fix.js).
gradle.projectsEvaluated {
  def emc = rootProject.findProject(':expo-modules-core')
  if (emc == null || !emc.projectDir.absolutePath.contains(' ')) {
    return
  }

  // Splits a compile_commands.json "command" like a shell: spaces separate arguments except
  // inside double quotes; \\" is a literal quote. Backslashes in Windows paths are kept.
  def splitCommand = { String command ->
    def args = []
    def current = new StringBuilder()
    boolean quoted = false
    boolean started = false
    for (int i = 0; i < command.length(); i++) {
      char c = command.charAt(i)
      if (c == ('\\\\' as char) && i + 1 < command.length() && command.charAt(i + 1) == ('"' as char)) {
        current.append('"'); started = true; i++
      } else if (c == ('"' as char)) {
        quoted = !quoted; started = true
      } else if (Character.isWhitespace(c) && !quoted) {
        if (started) { args << current.toString(); current.setLength(0); started = false }
      } else {
        current.append(c); started = true
      }
    }
    if (started) args << current.toString()
    return args
  }

  emc.tasks.matching { it.name == 'generateStubPCH' }.configureEach { enabled = false }

  def quotedStub = emc.tasks.register('generateStubPCHQuoted') {
    dependsOn('configureCMakeDebug')
    doLast {
      def cxxDir = emc.file('.cxx')
      if (!cxxDir.exists()) return
      cxxDir.eachFileRecurse { file ->
        if (file.name != 'compile_commands.json') return
        new groovy.json.JsonSlurper().parseText(file.text).each { entry ->
          if (!entry.file.endsWith('cmake_pch.hxx.cxx')) return
          def pchFile = new File(entry.file.substring(0, entry.file.length() - '.cxx'.length()) + '.pch')
          if (!pchFile.exists() || pchFile.length() == 0) {
            def stubHeader = new File(entry.directory, 'stub_pch.hxx')
            stubHeader.text = ''
            def stubHeaderPath = stubHeader.absolutePath.replace('\\\\', '/')
            // Same substitutions as the original: the forced include and the source operand.
            def args = splitCommand(entry.command).collect { arg ->
              (arg.endsWith('cmake_pch.hxx') || arg.endsWith('cmake_pch.hxx.cxx')) ? stubHeaderPath : arg
            }
            def process = new ProcessBuilder(args)
              .directory(new File(entry.directory))
              .redirectErrorStream(true)
              .start()
            def output = process.inputStream.text
            if (process.waitFor() != 0) {
              throw new GradleException("Stub PCH generation failed: \${output}")
            }
          }
          // Older than the source, so ninja rebuilds the real PCH during the build.
          pchFile.setLastModified(new File(entry.file).lastModified() - 1)
        }
      }
    }
  }

  emc.tasks.matching { it.name == 'prepareKotlinBuildScriptModel' }.configureEach { dependsOn(quotedStub) }
}
`;

module.exports = function withStubPchSpaceFix(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('with-stub-pch-space-fix expects a Groovy android/build.gradle');
    }
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += SNIPPET;
    }
    return mod;
  });
};
