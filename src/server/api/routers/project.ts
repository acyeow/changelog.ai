import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { pollCommits } from "~/lib/github";
import { indexGithubRepo } from "~/lib/github-loader";

const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const projectRouter = createTRPCRouter({
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        githubUrl: z.string(),
        githubToken: z.string().optional(),
        branch: z.string().optional().default("main"), // Add branch parameter with default
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sanitizedGithubUrl = input.githubUrl.replace(/\/.git$/, "");
      const project = await ctx.db.project.create({
        data: {
          githubUrl: input.githubUrl,
          name: input.name,
          // Store the branch in the database
          branch: input.branch || "main",
          userToProjects: {
            create: {
              userId: ctx.user.userId!,
            },
          },
        },
      });
      await indexGithubRepo(
        project.id,
        sanitizedGithubUrl,
        input.githubToken,
        input.branch, // Pass branch to indexGithubRepo
      );
      await pollCommits(project.id);
      return project;
    }),
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!,
          },
        },
        deletedAt: null,
      },
    });
  }),
  getCommits: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      pollCommits(input.projectId).then().catch(console.error);
      return await ctx.db.commit.findMany({
        where: {
          projectId: input.projectId,
        },
      });
    }),
  saveAnswer: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string(),
        answer: z.string(),
        filesReference: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.question.create({
        data: {
          answer: input.answer,
          filesReferences: input.filesReference,
          projectId: input.projectId,
          question: capitalizeFirstLetter(input.question),
          userId: ctx.user.userId!,
        },
      });
    }),
  getQuestions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.question.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),
});
