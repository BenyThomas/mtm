import { useEffect, useState } from 'react';
import { listInviteCampaigns, listInviteChannels } from '../api/gateway/invites';

const useInviteCatalog = () => {
  const [catalog, setCatalog] = useState({ campaigns: [], channels: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [campaignsResponse, channelsResponse] = await Promise.all([
        listInviteCampaigns({ active: true, limit: 200, offset: 0, orderBy: 'name', sortOrder: 'asc' }),
        listInviteChannels({ active: true, limit: 200, offset: 0, orderBy: 'name', sortOrder: 'asc' }),
      ]);
      setCatalog({
        campaigns: Array.isArray(campaignsResponse?.items) ? campaignsResponse.items : [],
        channels: Array.isArray(channelsResponse?.items) ? channelsResponse.items : [],
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load invite catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { catalog, loading, error, reload: load };
};

export default useInviteCatalog;
