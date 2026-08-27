import { Request, Response } from 'express';
import { IngestionService } from '../services/ingestion.service';
import { prisma } from '../models/prismaClient';

export const handleUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No CSV file provided' });
      return;
    }

    const fileType = (req.body.fileType || 'LOAN_TAPE') as 'LOAN_TAPE' | 'SERVICER_UPDATE' | 'DOCUMENT_MANIFEST';
    const uploader = req.body.uploader || 'Data Operator';

    const upload = await IngestionService.processCsv(req.file.path, fileType, uploader);
    res.status(200).json(upload);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
};

export const listUploads = async (req: Request, res: Response) => {
  try {
    const uploads = await prisma.upload.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(uploads);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch uploads', details: error.message });
  }
};
