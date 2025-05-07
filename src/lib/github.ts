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
  return sortedCommits.slice(0, 10).map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message.split("\n")[0] ?? "", // Limit to first line
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

  // Save commits without summaries
  const createdCommits = await db.commit.createMany({
    data: unprocessedCommits.map((commit) => ({
      projectId: projectId,
      commitHash: commit.commitHash,
      commitMessage: commit.commitMessage,
      commitAuthorName: commit.commitAuthorName,
      commitAuthorAvatar: commit.commitAuthorAvatar,
      commitDate: commit.commitDate,
      summary: "", // No summary initially
    })),
  });

  // Fetch the IDs of the newly created commits
  const commitIds = (
    await db.commit.findMany({
      where: {
        projectId,
        commitHash: {
          in: unprocessedCommits.map((commit) => commit.commitHash),
        },
      },
      select: { id: true },
    })
  ).map((commit) => commit.id);

  // Process summaries in the background
  processCommitSummaries(githubUrl, commitIds);

  return unprocessedCommits;
};

const processCommitSummaries = async (
  githubUrl: string,
  commitIds: string[], // Accept commit IDs instead of full commit objects
) => {
  for (const [index, commitId] of commitIds.entries()) {
    console.log(`Processing commit ${index + 1}/${commitIds.length}`);

    // Fetch the commit using its ID
    const commit = await db.commit.findUnique({
      where: { id: commitId },
    });

    if (!commit) {
      console.error(`Commit with ID ${commitId} not found.`);
      continue;
    }

    // Generate the summary
    const summary = await summariseCommit(githubUrl, commit.commitHash);

    // Update the database with the generated summary
    await db.commit.update({
      where: { id: commitId },
      data: { summary },
    });

    // Introduce a 20-second delay between each commit processing
    if (index < commitIds.length - 1) {
      console.log("Waiting 20 seconds before processing the next commit...");
      await new Promise((resolve) => setTimeout(resolve, 20000)); // 20 seconds
    }
  }
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
