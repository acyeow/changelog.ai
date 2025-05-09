import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { pollCommits } from "~/lib/github";
import { indexGithubRepo } from "~/lib/github-loader";

const sanitizeString = (input: string): string => {
  return input.replace(/\0/g, ""); // Remove null bytes
};

export const projectRouter = createTRPCRouter({
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        githubUrl: z.string(),
        githubToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sanitizedGithubUrl = input.githubUrl.replace(/\/.git$/, "");
      // Context validation
      if (!ctx.user?.userId) {
        throw new Error("User ID is missing or invalid.");
      }
      const userExists = await ctx.db.user.findUnique({
        where: { id: ctx.user.userId },
      });
      if (!userExists) {
        throw new Error("User does not exist.");
      }
      const project = await ctx.db.project.create({
        data: {
          githubUrl: input.githubUrl,
          name: input.name,
          userToProjects: {
            create: {
              userId: ctx.user.userId!,
            },
          },
        },
      });
      await indexGithubRepo(project.id, sanitizedGithubUrl, input.githubToken);
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
});
