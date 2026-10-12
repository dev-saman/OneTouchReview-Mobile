import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fieldError } from '@/api/errors';
import { reviewRequestsApi } from '@/api/reviewRequests.api';
import type { ApiError, Customer, ReviewChannel, SendResult } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconTile, type IconName } from '@/components/ui/IconTile';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { colors, font, radius, spacing } from '@/constants/theme';
import { selectSelectedLocation } from '@/features/location/selectors';
import { ClientSearch } from '@/features/send/ClientSearch';
import { describeRefusal, describeSendWarning } from '@/features/send/refusal';
import { toApiError } from '@/hooks/useApiQuery';
import { useAppSelector } from '@/store/hooks';
import { formatDate, formatDateTime, formatPhone, isFuture } from '@/utils/format';

/** Build guide wording; the tick is never pre-ticked. */
const CONSENT_LABEL = 'This client agreed to receive texts from us';

type Mode = 'existing' | 'new';

/** Screen 2: send a review request to an existing client, or add one and send. */
export default function SendScreen() {
  const router = useRouter();
  const selected = useAppSelector(selectSelectedLocation);
  const locations = useAppSelector((s) => s.location.locations);

  const [mode, setMode] = useState<Mode>('existing');
  const [client, setClient] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [channel, setChannel] = useState<ReviewChannel>('auto');
  // A specific location is required; "All locations" (or several) means the user picks one here.
  const [pickedLocation, setPickedLocation] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<{ answer: SendResult; customerId: number | null; clientName: string } | null>(
    null,
  );

  if (selected === null) {
    return <EmptyState title="No locations yet" message="Add a location on the web before sending requests." />;
  }

  const fixedLocation = typeof selected === 'number' ? selected : locations.length === 1 ? locations[0].id : null;
  const locationId = fixedLocation ?? pickedLocation;
  const locationName = locations.find((l) => l.id === locationId)?.name;

  const hasPhone = phone.trim().length > 0;
  const hasEmail = email.trim().length > 0;
  // The choice only matters when the client can get both; otherwise "auto" picks the only channel.
  const canChoose = mode === 'existing' ? !!client?.phone && !!client?.email : hasPhone && hasEmail;
  const effectiveChannel: ReviewChannel = canChoose ? channel : 'auto';
  const canSend =
    !!locationId &&
    !sending &&
    (mode === 'existing' ? !!client : name.trim().length > 0 && (hasPhone || hasEmail) && (!hasPhone || consent));

  const changePhone = (value: string) => {
    setPhone(value);
    // No phone → no tick. Typing a phone again starts unticked.
    if (!value.trim()) setConsent(false);
  };

  const reset = () => {
    setClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setConsent(false);
    setChannel('auto');
    setError(null);
    setResult(null);
  };

  const send = async () => {
    if (!canSend || !locationId) return;
    setSending(true);
    setError(null);
    try {
      if (mode === 'existing' && client) {
        const answer = await reviewRequestsApi.send(client.id, locationId, effectiveChannel);
        setResult({ answer, customerId: client.id, clientName: client.name });
      } else {
        const answer = await reviewRequestsApi.sendToNewClient({
          name,
          phone,
          email,
          locationId,
          consentConfirmed: hasPhone ? consent : undefined,
          channel: effectiveChannel,
        });
        setResult({ answer, customerId: answer.customer?.id ?? null, clientName: answer.customer?.name ?? name.trim() });
      }
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSending(false);
    }
  };

  /** NO_CONSENT for an existing client: add them again with the tick (the API matches the client). */
  const confirmConsentFor = (c: Customer) => {
    setMode('new');
    setName(c.name);
    setPhone(c.phone ?? '');
    setEmail(c.email ?? '');
    setConsent(false);
    setError(null);
  };

  if (result) {
    return <Sent result={result} onAnother={reset} onOpenClient={(id) => router.push({ pathname: '/client/[id]', params: { id: String(id) } })} />;
  }

  const refusal = error && error.kind !== 'validation' ? describeRefusal(error) : null;

  return (
    <Screen>
      <View style={styles.tabs} accessibilityRole="tablist">
        <ModeTab label="Existing client" active={mode === 'existing'} onPress={() => { setMode('existing'); setError(null); }} />
        <ModeTab label="New client" active={mode === 'new'} onPress={() => { setMode('new'); setError(null); }} />
      </View>

      {fixedLocation === null ? (
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.chips}>
            {locations.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => setPickedLocation(l.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: pickedLocation === l.id }}
                style={[styles.chip, pickedLocation === l.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, pickedLocation === l.id && styles.chipTextActive]}>{l.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {mode === 'existing' ? (
        client ? (
          <Card>
            <View style={styles.pickedRow}>
              <View style={styles.pickedText}>
                <Text style={font.heading}>{client.name}</Text>
                {client.phone ? <Text style={font.small}>{formatPhone(client.phone)}</Text> : null}
                {client.email ? <Text style={font.small}>{client.email}</Text> : null}
              </View>
              <Button title="Change" variant="text" onPress={() => { setClient(null); setError(null); }} />
            </View>
            {isFuture(client.next_request_allowed_at) ? (
              <Badge label={`Can be asked again on ${formatDate(client.next_request_allowed_at)}`} tone="warning" />
            ) : null}
          </Card>
        ) : (
          <ClientSearch location={selected} onPick={(c) => { setClient(c); setError(null); }} />
        )
      ) : (
        <View style={styles.section}>
          <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" error={fieldError(error, 'name')} />
          <TextField
            label="Mobile phone"
            value={phone}
            onChangeText={changePhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={fieldError(error, 'phone')}
          />
          {hasPhone ? (
            <Checkbox label={CONSENT_LABEL} checked={consent} onChange={setConsent} error={fieldError(error, 'consent_confirmed')} />
          ) : null}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={fieldError(error, 'email')}
          />
          <Text style={font.caption}>
            Add a phone, an email, or both. {hasPhone ? 'We text when we can.' : hasEmail ? 'With only an email, the request goes by email.' : ''}
          </Text>
        </View>
      )}

      {canChoose ? <ContactMethod value={channel} onChange={setChannel} /> : null}

      {refusal && error ? (
        <View style={styles.refusal} accessibilityLiveRegion="polite">
          <Text style={styles.refusalTitle}>{refusal.title}</Text>
          <Text style={font.body}>{error.message}</Text>
          {refusal.details.map((line) => (
            <Text key={line} style={font.small}>
              {line}
            </Text>
          ))}
          {refusal.canConfirmConsent && mode === 'existing' && client?.phone ? (
            <Button title="The client agreed — confirm consent" variant="secondary" onPress={() => confirmConsentFor(client)} />
          ) : null}
        </View>
      ) : error && !['name', 'phone', 'email', 'consent_confirmed'].some((f) => fieldError(error, f)) ? (
        <Text style={styles.errorText}>{error.message}</Text>
      ) : null}

      <Button
        title={locationName ? `Send review request · ${locationName}` : 'Send review request'}
        onPress={send}
        loading={sending}
        disabled={!canSend}
      />
      {!locationId ? <Text style={font.caption}>Choose a location first.</Text> : null}
    </Screen>
  );
}

const CHANNELS: { value: ReviewChannel; icon: IconName; title: string; note: string }[] = [
  { value: 'auto', icon: 'flash-outline', title: 'Automatic', note: 'Text when we can, otherwise email' },
  { value: 'sms', icon: 'chatbubble-outline', title: 'Text message', note: 'Send the review request by text' },
  { value: 'email', icon: 'mail-outline', title: 'Email', note: 'Send the review request by email' },
];

/** "Contact method" from the mockups: the API's channel (auto / sms / email). */
function ContactMethod({ value, onChange }: { value: ReviewChannel; onChange: (value: ReviewChannel) => void }) {
  return (
    <View style={styles.section} accessibilityRole="radiogroup">
      <Text style={styles.label}>Contact method</Text>
      {CHANNELS.map((c) => {
        const selected = c.value === value;
        return (
          <Pressable
            key={c.value}
            onPress={() => onChange(c.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.method, selected && styles.methodSelected]}
          >
            <IconTile name={c.icon} size={36} />
            <View style={styles.methodText}>
              <Text style={styles.methodTitle}>{c.title}</Text>
              <Text style={font.caption}>{c.note}</Text>
            </View>
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selected ? colors.primary : colors.textSubtle}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Sent({
  result,
  onAnother,
  onOpenClient,
}: {
  result: { answer: SendResult; customerId: number | null; clientName: string };
  onAnother: () => void;
  onOpenClient: (id: number) => void;
}) {
  const { answer, customerId, clientName } = result;
  const later = isFuture(answer.sends_at);
  const warning = describeSendWarning(answer.warning);

  return (
    <Screen>
      <Card>
        <Text style={font.title}>{later ? 'Request scheduled' : 'Request sent'}</Text>
        <Text style={font.body}>{answer.message}</Text>
        <Text style={font.body}>
          {later
            ? `${clientName} gets the review link on ${formatDateTime(answer.sends_at)}.`
            : `${clientName} gets the review link now.`}
        </Text>
        {later ? (
          <Text style={font.small}>Texts only go out 8am–9pm in the client’s time; some businesses also wait a set time after the visit.</Text>
        ) : null}
        {answer.customer_created ? <Badge label="New client added" tone="success" /> : null}
        {warning ? (
          <View style={styles.warning}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        ) : null}
      </Card>
      <Button title="Send another" onPress={onAnother} />
      {customerId ? <Button title={`Open ${clientName}`} variant="secondary" onPress={() => onOpenClient(customerId)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  methodText: { flex: 1, gap: 2 },
  methodTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSurface,
  },
  warningText: { flex: 1, fontSize: 14, color: colors.warning },
  tabs: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  tabTextActive: { color: colors.onPrimary },
  section: { gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  pickedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pickedText: { flex: 1, gap: 2 },
  refusal: { backgroundColor: colors.dangerSurface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  refusalTitle: { fontSize: 16, fontWeight: '700', color: colors.danger },
  errorText: { color: colors.danger, fontSize: 14 },
});
