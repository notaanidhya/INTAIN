import app from './app';
import dotenv from 'dotenv';
import { prisma } from './models/prismaClient';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function reconcileLoanStatuses() {
  const staleLoans = await prisma.loan.findMany({
    where: { verificationStatus: 'EXCEPTIONS_FOUND' },
    select: { id: true }
  });

  for (const loan of staleLoans) {
    const openCount = await prisma.exception.count({
      where: { loanId: loan.id, status: 'OPEN' }
    });
    if (openCount === 0) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: { verificationStatus: 'PENDING' }
      });
    }
  }

  if (staleLoans.length > 0) {
    console.log(`Reconciled verification status for ${staleLoans.length} loan(s).`);
  }
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await reconcileLoanStatuses();
});
