import Track from "../models/Track.js";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RecognizeController = {
    recognize: async (req, res) => {
        try {
            const audioFile = req.file;

            const pythonScriptPath = join(__dirname, '..', '..', 'src', 'service', 'shazamService.py');
            const pythonProcess = spawn('python3', [pythonScriptPath]);

            pythonProcess.stdin.write(audioFile.buffer);
            pythonProcess.stdin.end();

            let buffer = "";
            pythonProcess.stdout.on("data", d => buffer += d.toString());

            pythonProcess.stdout.on("end", () => {
                const json = JSON.parse(buffer);
                res.json(json);
            });
        } catch (error) {
            console.error('Server error:', error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }
};

export default RecognizeController;