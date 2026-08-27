import { Router } from 'express';
import multer from 'multer';
import { handleUpload, listUploads } from '../controllers/upload.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', listUploads);
router.post('/', upload.single('file'), handleUpload);

export default router;
