import React, { useEffect, useState } from 'react';

export default function LocalVideoPreview({ video }: { video: Blob | null }): React.ReactElement | null {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!video) { setUrl(''); return; }
    const objectUrl = URL.createObjectURL(video);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [video]);
  if (!url) return null;
  return <video
    aria-label='Preview your generated vertical video'
    src={url}
    controls
    playsInline
    preload='metadata'
    style={{ display: 'block', width: '100%', maxWidth: 290, aspectRatio: '9 / 16', background: '#0B1020', borderRadius: 16, margin: '16px auto 0' }}
  />;
}
