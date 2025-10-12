import Track from '../models/Track.js';
import RefreshToken from '../models/RefreshToken.js';

// Handle R2 Url
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fetch from "node-fetch";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: `${process.env.R2_ACCESS_KEY_ID}`,
    secretAccessKey: `${process.env.R2_SECRET_ACCESS_KEY}`,
  },
});

const BUCKET = "musichub";

async function getSignedR2Url(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

const TrackController = {
    getTrack: async (req, res) => {
        try {
            const { id } = req.params;
            const extra = req.params[0];

            const track = await Track.findById(id).select('audioUrl title');
            if (!track) return res.status(400).json({ message: 'Track not found' });

            const audioUrl = track.audioUrl;
            if(!audioUrl) return res.status(401).json({ message: 'Url not found'});

            // Handle R2 Url
            if (extra) {
                // build segment key: if audioUrl is a folder/playlist base, join; else assume extra is full key relative to same folder
                let segmentKey;
                if (/^https?:\/\//i.test(audioUrl)) {
                // if base is url, reconstruct absolute path by folder + extra
                const folder = audioUrl.replace(/[^/]+$/, ''); // include trailing slash
                segmentKey = folder + decodeURIComponent(extra);
                } else {
                const folder = audioUrl.replace(/[^/]+$/, '');
                segmentKey = folder + decodeURIComponent(extra);
                }
                const signed = await getSignedR2Url(segmentKey);
                const response = await fetch(signed);

                if (!response.ok) return res.status(502).send('Bad gateway');
                res.setHeader("Content-Type", response.headers.get('content-type') || 'application/octet-stream');
                return response.body.pipe(res);
            }

            const accept = req.get('accept') || '';
            const wantsJson = accept.includes('application/json') || req.query.metadata === '1';

            if (wantsJson) return res.status(200).json({ message: 'Track found', data: track});
            
            if(/\.m3u8$/i.test(audioUrl)) {
                // if m3u8, redirect to signed url for playlist
                const signed = await getSignedR2Url(audioUrl);
                console.log('Redirecting to signed m3u8 URL', signed);
                const response = await fetch(signed);
                console.log('Fetched m3u8 from R2:', response.status, response.statusText);
                if (!response.ok) return res.status(503).send('Empty playlist');
                let text = await response.text();
                
                const folder = audioUrl.replace(/[^/]+$/, ''); // songs/song_name/
                // viết lại các file đuôi .ts thành /api/tracks/getTrack/:id/<encodedKey>
                const rewritten = text.replace(/([^\n#]+\.ts)/g, (match) => {
                    const tsKey = folder + match;
                    // encode so path safe
                    return `/api/tracks/getTrack/${encodeURIComponent(id)}/${encodeURIComponent(tsKey)}`;
                });
            }

            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            return res.send(rewritten);

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
}

export default TrackController;