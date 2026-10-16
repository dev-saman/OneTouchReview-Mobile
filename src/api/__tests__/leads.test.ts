import { leadsApi } from '../leads.api';
import { network } from '../network';

jest.mock('../network', () => ({ network: { post: jest.fn().mockResolvedValue({ customer: { id: 2 } }) } }));
const post = network.post as jest.Mock;

beforeEach(() => post.mockClear());

describe('leadsApi.addClient', () => {
  it('posts to the lead with its string id and sends consent exactly as ticked', async () => {
    await leadsApi.addClient('a7', { name: ' Alex A. ', phone: '+15125550102', locationId: 1497, consentConfirmed: true });
    expect(post).toHaveBeenCalledWith('/leads/a7/add-client', {
      name: 'Alex A.',
      phone: '+15125550102',
      email: undefined,
      location_id: 1497,
      consent_confirmed: true,
    });
  });

  it('never sends consent_confirmed: true unless it was ticked', async () => {
    await leadsApi.addClient('c5', { name: 'Alex', phone: '+15125550102', locationId: 1497 });
    expect(post.mock.calls[0][1]).toMatchObject({ consent_confirmed: false });
  });

  it('email-only leads get no consent fields', async () => {
    await leadsApi.addClient('c5', { name: 'Alex', phone: ' ', email: 'alex@example.com', locationId: 1497, consentConfirmed: true });
    expect(post.mock.calls[0][1]).not.toHaveProperty('consent_confirmed');
  });
});
