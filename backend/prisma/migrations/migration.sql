-- CreateTable
CREATE TABLE "ExceptionRequest" (
    "id" SERIAL NOT NULL,
    "serverName" TEXT NOT NULL,
    "vulnerabilities" TEXT[] NOT NULL,
    "justification" TEXT NOT NULL,
    "mitigation" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExceptionRequest_pkey" PRIMARY KEY ("id")
); 