export const parseTidalUrl = (url: string) => {
  try {
    const urlInstance = new URL(url);
    const matched = urlInstance.pathname.match(`/(?<type>.+)/(?<id>.+)`);

    if (!matched) {
      return;
    }

    const params = matched.groups as {
      id: string;
      type: string;
    };

    if (params.type === 'track') {
      return {
        type: 'tidal',
        url: {
          id: params.id,
          type: params.type,
        },
      };
    }
  } catch (error) {}
};
