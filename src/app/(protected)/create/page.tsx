"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import useRefetch from "~/hooks/use-refetch";
import { api } from "~/trpc/react";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const refetch = useRefetch();

  function onSubmit(data: FormInput) {
    const sanitizedGithubUrl = data.repoUrl.replace(/\/.git$/, "");
    createProject.mutate(
      {
        githubUrl: sanitizedGithubUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("Project created successfully!");
          refetch();
          reset(); // Reset the form after successful submission
        },
        onError: () => {
          toast.error("Failed to create the project.");
        },
      },
    );
    return true;
  }
  return (
    <div className="flex h-full items-center justify-center gap-12">
      <img
        src="/undraw_developer-activity_dn7p(1).svg"
        className="h-56 w-auto"
      />
      <div>
        <div>
          <h1 className="text-2xl font-semibold">
            Link your GitHub repository
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter the URL of your repository to link it to changelog.ai.
          </p>
          <div className="h-2"></div>
          <p className="text-muted-foreground text-sm">
            (Note: Commit summaries take time to generate and occur in the
            background.)
          </p>
        </div>
        <div className="h-4"></div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register("projectName", { required: true })}
              placeholder="Project Name"
              required
            />
            <div className="h-2"></div>
            <Input
              {...register("repoUrl", { required: true })}
              placeholder="Github URL"
              type="url"
              required
            />
            <div className="h-2"></div>
            <Input
              {...register("githubToken")}
              placeholder="Github Token (Optional)"
            />
            <div className="h-4"></div>
            <Button type="submit" disabled={createProject.isPending}>
              Create Project
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
