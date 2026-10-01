-- CreateTable
CREATE TABLE "SimulatedPayment" (
    "token" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "paidPrice" DECIMAL(12,2) NOT NULL,
    "basketItems" JSONB NOT NULL,
    "outcome" TEXT,
    "refunds" JSONB NOT NULL DEFAULT '{}',
    "callbackUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SimulatedPayment_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulatedPayment_paymentId_key" ON "SimulatedPayment"("paymentId");

