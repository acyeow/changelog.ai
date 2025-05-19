"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import useProject from "~/hooks/use-project";
import {
  DialogHeader,
  DialogTitle,
  Dialog,
  DialogContent,
} from "~/components/ui/dialog";
import Image from "next/image";
import { askQuestion } from "./actions";
import MDEditor from "@uiw/react-md-editor";

import CodeReferences from "./code-references";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import useRefetch from "~/hooks/use-refetch";

const AskQuestionCard = () => {
  const { project } = useProject();
  const [open, setOpen] = React.useState(false); // State to control dialog visibility
  const [question, setQuestion] = React.useState(""); // State to hold the question
  const [loading, setLoading] = React.useState(false); // State to indicate loading state
  const [filesReference, setFilesReference] = React.useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]); // State to hold file references
  const [answer, setAnswer] = React.useState(""); // State to hold the answer
  const saveAnswer = api.project.saveAnswer.useMutation();
  const refetch = useRefetch();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!project?.id) return;
    e.preventDefault();
    setLoading(true);
    setAnswer(""); // Clear previous answer
    setFilesReference([]); // Clear previous files reference

    try {
      const { stream, filesReference } = await askQuestion(
        question,
        project.id,
      );
      setOpen(true);
      setFilesReference(filesReference);
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          setAnswer((prev) => prev + event.delta);
        }
      }
    } catch (error) {
      console.error("Error asking question:", error);
      setAnswer(
        "Sorry, I encountered an error while processing your question. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[80vw]">
          <DialogHeader>
            <div className="flex items-center gap-10">
              <DialogTitle>
                <Image
                  src="undraw_dog_jfxm.svg"
                  alt="changelog.ai"
                  width={100}
                  height={100}
                />
              </DialogTitle>
              <Button
                disabled={saveAnswer.isPending}
                variant={"outline"}
                onClick={() => {
                  saveAnswer.mutate(
                    {
                      projectId: project!.id,
                      question,
                      answer,
                      filesReference,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Answer saved successfully!");
                        refetch();
                      },
                      onError: () => {
                        toast.error("Failed to save answer.");
                      },
                    },
                  );
                }}
              >
                Save Answer
              </Button>
            </div>
          </DialogHeader>
          <div data-color-mode="light">
            <MDEditor.Markdown
              source={answer}
              className="h-full max-h-[30vh] max-w-[70vw] overflow-scroll"
            />
          </div>
          <div className="h-4"></div>
          <CodeReferences filesReference={filesReference} />
          <Button type="button" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
      <Card className="relative col-span-3">
        <CardHeader>
          <CardTitle>Ask a question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <Textarea
              placeholder="What file should I edit to change the home page?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              className={loading ? "cursor-not-allowed opacity-70" : ""}
            />
            <div className="h-4"></div>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Ask changelog.ai"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuestionCard;
