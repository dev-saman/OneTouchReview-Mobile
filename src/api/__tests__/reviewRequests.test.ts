import { network } from '../network';
import { reviewRequestsApi } from '../reviewRequests.api';

jest.mock('../network', () => ({ network: { post: jest.fn().mockResolvedValue({}) } }));
const post = network.post as jest.Mock;

beforeEach(() => post.mockClear());

describe('reviewRequestsApi.sendToNewClient', () => {
  it('with a phone, sends consent_confirmed exactly as ticked', async () => {
    await reviewRequestsApi.sendToNewClient({
      name: ' Nina Park ',
      phone: '(512) 555-0123',
      email: 'nina@example.com',
      locationId: 1497,
      consentConfirmed: true,
    });
    expect(post).toHaveBeenCalledWith('/review-requests/with-customer', {
      name: 'Nina Park',
      phone: '(512) 555-0123',
      email: 'nina@example.com',
      location_id: 1497,
      channel: 'auto',
      consent_confirmed: true,
    });
  });

  it('never sends consent_confirmed: true unless it was ticked', async () => {
    await reviewRequestsApi.sendToNewClient({ name: 'Nina', phone: '5125550123', locationId: 1497 });
    expect(post.mock.calls[0][1]).toMatchObject({ consent_confirmed: false });
  });

  it('email-only clients get no consent fields', async () => {
    await reviewRequestsApi.sendToNewClient({
      name: 'Nina',
      phone: '  ',
      email: 'nina@example.com',
      locationId: 1497,
      consentConfirmed: true,
    });
    const body = post.mock.calls[0][1];
    expect(body).not.toHaveProperty('consent_confirmed');
    expect(body).not.toHaveProperty('consent_method');
    expect(body.phone).toBeUndefined();
    expect(body).toMatchObject({ name: 'Nina', email: 'nina@example.com', channel: 'auto' });
  });
});

describe('reviewRequestsApi.send', () => {
  it('sends to an existing client at a specific location', async () => {
    await reviewRequestsApi.send(55, 1498);
    expect(post).toHaveBeenCalledWith('/review-requests', { customer_id: 55, location_id: 1498, channel: 'auto' });
  });
});
