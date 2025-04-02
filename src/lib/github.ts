import { Octokit } from "octokit";
import { db } from "~/server/db";
import axios from "axios";
import { aiSummariseCommit } from "./openai";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) {
    throw new Error("Invalid Github URL");
  }
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
  });
  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author.date).getTime() -
      new Date(a.commit.author.date).getTime(),
  ) as any[];
  return sortedCommits.slice(0, 15).map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit.author.name ?? "",
    commitAuthorAvatar: commit.author.avatar_url ?? "",
    commitDate: commit.commit.author.date ?? "",
  }));
};

export const pollCommits = async (projectId: string) => {
  const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );
  const summaryResponses = await Promise.allSettled(
    unprocessedCommits.map((commit) => {
      return summariseCommit(githubUrl, commit.commitHash);
    }),
  );
  const summaries = summaryResponses.map((response) => {
    if (response.status === "fulfilled") {
      return response.value;
    } else {
      return "";
    }
  });

  //save to db
  const commits = await db.commit.createMany({
    data: summaries.map((summary, index) => {
      console.log("processing commit", index);
      return {
        projectId: projectId,
        commitHash: unprocessedCommits[index]!.commitHash,
        commitMessage: unprocessedCommits[index]!.commitMessage,
        commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
        commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
        commitDate: unprocessedCommits[index]!.commitDate,
        summary: summary,
      };
    }),
  });
  return commits;
};

async function summariseCommit(githubUrl: string, commitHash: string) {
  // get the diff, then pass the diff into ai
  const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
    headers: {
      Accept: "application/vnd.github.v3.diff",
    },
  });
  return (await aiSummariseCommit(data)) || "";
}

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      githubUrl: true,
    },
  });
  if (!project?.githubUrl) {
    throw new Error("Project has no Github URL");
  }
  const sanitizedGithubUrl = project.githubUrl.endsWith(".git")
    ? project.githubUrl.slice(0, -4)
    : project.githubUrl;
  return { project, githubUrl: sanitizedGithubUrl };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });
  const unprocessedCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommits) => processedCommits.commitHash === commit.commitHash,
      ),
  );
  return unprocessedCommits;
}

// const id = "cm909mhwq0000qjefcsyw1ls3";

// const { project, githubUrl } = await fetchProjectGithubUrl(id);
// const commitHashes = await getCommitHashes(githubUrl);
// const unprocessedCommits = await filterUnprocessedCommits(id, commitHashes);
// const summaryResponses = await Promise.allSettled(
//   unprocessedCommits.map((commit) => {
//     return summariseCommit(githubUrl, commit.commitHash);
//   }),
// );
// const summaries = summaryResponses.map((response) => {
//   if (response.status === "fulfilled") {
//     return response.value;
//   } else {
//     return "";
//   }
// });
