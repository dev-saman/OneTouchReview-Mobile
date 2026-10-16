import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';

import { fieldError } from '@/api/errors';
import { leadsApi } from '@/api/leads.api';
import type { ApiError, Lead } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chips } from '@/components/ui/Chips';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, font, spacing } from '@/constants/theme';
import { toApiError } from '@/hooks/useApiQuery';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatDateTime, formatPhone } from '@/utils/format';

import { phoneNote, sourceLabel } from './sources';

/** Same wording as Send: never pre-ticked, and only asked when a phone is typed. */
const CONSENT_LABEL = 'This client agreed to receive texts from us';

/**
 * One lead: open its chat or assistant conversation, or add it as a client (same consent rules as
 * adding a client). 409 ALREADY_CLIENT opens that client.
 */
export function LeadSheet({ lead, location, onClose }: { lead: Lead; location: LocationSelection; onClose: () => void }) {
  const router = useRouter();
  const locations = useAppSelector((s) => s.location.locations);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(lead.name ?? '');
  const [phone, setPhone] = useState(lead.phone ?? '');
  const [email, setEmail] = useState(lead.email ?? '');
  const [consent, setConsent] = useState(false);
  const [locationId, setLocationId] = useState<number | null>(
    lead.location?.id ?? (typeof location === 'number' ? location : locations.length === 1 ? locations[0].id : null),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const hasPhone = !!phone.trim();

  const go = (open: () => void) => {
    onClose();
    open();
  };
  const openClient = (id: number) => go(() => router.push({ pathname: '/client/[id]', params: { id: String(id) } }));

  const add = async () => {
    if (!locationId) return;
    setBusy(true);
    setError(null);
    try {
      const customer = await leadsApi.addClient(lead.id, { name, phone, email, locationId, consentConfirmed: hasPhone && consent });
      Alert.alert('Client added', `${customer.name} is now a client.`);
      openClient(customer.id);
    } catch (e) {
      const err = toApiError(e);
      const existing = typeof err.details?.customer_id === 'number' ? err.details.customer_id : null;
      if (err.code === 'ALREADY_CLIENT' && existing) {
        Alert.alert('Already a client', err.message, [{ text: 'Open client', onPress: () => openClient(existing) }]);
      } else {
        setError(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const note = phoneNote(lead);
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen edges={['top', 'bottom']}>
        <Text style={font.title}>{lead.name || 'Visitor'}</Text>
        <View style={styles.badges}>
          <Badge label={sourceLabel(lead.source)} />
          {lead.customer_id ? <Badge label="Client" tone="success" /> : null}
        </View>
        <Card>
          {lead.phone ? <Text style={font.body}>{formatPhone(lead.phone)}</Text> : null}
          {note ? <Text style={styles.warning}>{note}</Text> : null}
          {lead.email ? <Text style={font.body}>{lead.email}</Text> : null}
          {lead.topic ? <Text style={font.small}>Topic: {lead.topic}</Text> : null}
          {lead.first_question ? <Text style={font.small}>“{lead.first_question}”</Text> : null}
          <Text style={font.caption}>
            {[...new Set([lead.card?.name, lead.location?.name, formatDateTime(lead.created_at)].filter(Boolean))].join(' · ')}
          </Text>
        </Card>

        {lead.chat_id ? (
          <Button title="Open the chat" icon="chatbubbles-outline" onPress={() => go(() => router.push({ pathname: '/chats/[id]', params: { id: String(lead.chat_id) } }))} />
        ) : null}
        {lead.conversation_id ? (
          <Button
            title="Open the assistant conversation"
            variant="secondary"
            icon="sparkles-outline"
            onPress={() => go(() => router.push({ pathname: '/assistant/[id]', params: { id: String(lead.conversation_id) } }))}
          />
        ) : null}

        {lead.customer_id ? (
          <Button title="Open client" variant="secondary" icon="person-outline" onPress={() => openClient(lead.customer_id!)} />
        ) : adding ? (
          <Card title="Add as client">
            <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" error={fieldError(error, 'name')} />
            <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={fieldError(error, 'phone')} />
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldError(error, 'email')}
            />
            {!lead.location && locations.length > 1 ? (
              <>
                <Text style={styles.label}>Location</Text>
                <Chips
                  options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
                  value={locationId ? String(locationId) : ''}
                  onChange={(v) => setLocationId(Number(v))}
                />
              </>
            ) : null}
            {hasPhone ? (
              <Checkbox label={CONSENT_LABEL} checked={consent} onChange={setConsent} error={fieldError(error, 'consent_confirmed')} />
            ) : null}
            {error && !error.fieldErrors ? <Text style={styles.error}>{error.message}</Text> : null}
            <Button
              title="Add client"
              onPress={add}
              loading={busy}
              disabled={!name.trim() || (!hasPhone && !email.trim()) || !locationId}
            />
          </Card>
        ) : (
          <Button title="Add as client" variant="secondary" icon="person-add-outline" onPress={() => setAdding(true)} />
        )}
        <Text style={font.caption}>Exporting leads is on the web.</Text>
        <Button title="Close" variant="text" onPress={onClose} />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  warning: { fontSize: 13, color: colors.warning },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  error: { color: colors.danger, fontSize: 14 },
});
