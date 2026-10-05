import { Global, Injectable, Module, type OnModuleDestroy } from "@nestjs/common";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const STORAGE = Symbol("STORAGE");

/** Where uploaded documents live. Postgres keeps only the object key (architecture doc, section 2). */
export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

// Settings are read on first use, so the API boots, and /health answers, without storage configured.
@Injectable()
class S3Storage implements ObjectStorage, OnModuleDestroy {
  private s3: { client: S3Client; bucket: string } | undefined;

  private connect(): { client: S3Client; bucket: string } {
    this.s3 ??= {
      bucket: requireEnv("S3_BUCKET"),
      client: new S3Client({
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.S3_REGION ?? "us-east-1",
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        credentials: {
          accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
          secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
        },
      }),
    };
    return this.s3;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { client, bucket } = this.connect();
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async delete(key: string): Promise<void> {
    const { client, bucket } = this.connect();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  onModuleDestroy(): void {
    this.s3?.client.destroy();
  }
}

@Global()
@Module({
  providers: [{ provide: STORAGE, useClass: S3Storage }],
  exports: [STORAGE],
})
export class StorageModule {}
