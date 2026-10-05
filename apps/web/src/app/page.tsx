import { APP_NAME } from "@resume-judge/types";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{APP_NAME}</h1>
      <p className="text-lg text-muted-foreground">
        Upload your resume and get a structured, evidence-based assessment.
      </p>
      <Button size="lg" disabled>
        Upload resume (coming soon)
      </Button>
    </main>
  );
}
