import Track from '../models/Track.js';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import client from '../utils/r2client.js';

const BUCKET = "musichub";
const song_name = "aziz_hedra-somebody's_pleasure";

export default function getTrackByID(songID) {
    const track = Track.findById(songID);
    return track
}

export async function getSignedR2Url(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}