-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "connections" (
    "store_id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "event_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "webhook_events_store_id_received_at_idx" ON "webhook_events"("store_id", "received_at");

