const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * Lets Android Studio's Gradle sync succeed when the project path contains a space
 * (this project lives in "D:\React Native\OneTouchReview").
 *
 * expo-modules-core (57.0.21) registers `generateStubPCH` as a dependency of
 * `prepareKotlinBuildScriptModel`, the task Android Studio runs on every sync. It rebuilds
 * the compiler command by splitting it on spaces (`cmd.split(" ")`) and matching paths with
 * `[^\s]+`, so a path with a space is cut in two and clang fails ("no such file or directory:
 * 'D:\React D:/React Native/…'"), failing the whole sync. Command-line builds never run it.
 *
 * The task only writes empty stub PCH files so the IDE's C++ indexer starts faster; the real
 * build compiles the proper PCH through ninja. So it is skipped when the path has a space and
 * left alone otherwise. Mapping a drive letter (subst) or a junction doesn't help: Node resolves
 * them back to the real path. Remove this plugin once expo-modules-core quotes its arguments.
 *
 * Lives in a config plugin because android/ is generated and gitignored (prebuild erases edits).
 */

const MARKER = '// [with-stub-pch-space-fix]';

const SNIPPET = `
${MARKER} expo-modules-core's generateStubPCH breaks on paths with spaces (see plugins/with-stub-pch-space-fix.js).
gradle.projectsEvaluated {
  def expoModulesCore = rootProject.findProject(':expo-modules-core')
  if (expoModulesCore != null && expoModulesCore.projectDir.absolutePath.contains(' ')) {
    expoModulesCore.tasks.matching { it.name == 'generateStubPCH' }.configureEach { enabled = false }
  }
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
