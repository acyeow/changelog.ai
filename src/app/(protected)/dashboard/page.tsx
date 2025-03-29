"use client";
import { useUser } from "@clerk/nextjs";
import { ExternalLink, Github } from "lucide-react";
import React from "react";
import useProject from "~/hooks/use-project";

const DashboardPage = () => {
  const { project } = useProject();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-4">
        <div className="bg-primary w-fit rounded-md px-4 py-3">
          <div className="flex items-center">
            <Github className="size-5 text-white" />
            <div className="ml-2">
              <p className="text-sm font-medium text-white">
                This project is linked to {""}
                <a
                  href={project?.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white/80 hover:underline"
                >
                  {project?.githubUrl}
                  <ExternalLink className="ml-1 size-4" />
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="h-4"></div>
        <div className="flex items-center gap-4">
          TeamMembers InviteButton ArchiveButton
        </div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          AskQuestionCard MeetingCard
        </div>
      </div>
      <div className="mt-8"></div>
      CommitLog
    </div>
    // <a
    //   href={project?.githubUrl}
    //   target="_blank"
    //   rel="noopener noreferrer"
    //   className="text-blue-500 hover:underline"
    // >
    //   {project?.githubUrl}
    // </a>
  );
};

export default DashboardPage;
