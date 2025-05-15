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

const AskQuestionCard = () => {
  const { project } = useProject();
  const [open, setOpen] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [filesReference, setFilesReference] = React.useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);
  const [answer, setAnswer] = React.useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!project?.id) return;
    e.preventDefault();
    setLoading(true);
    setOpen(true);
    setAnswer(""); // Clear previous answer

    try {
      const { output, filesReference } = await askQuestion(
        question,
        project.id,
      );

      setAnswer(output);
      setFilesReference(filesReference);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle></DialogTitle>
            <Image
              src="undraw_dog_jfxm.svg"
              alt="changelog.ai"
              width={100}
              height={100}
            />
          </DialogHeader>
          {answer}
          <h1>Files References</h1>
          {filesReference.map((file) => {
            return <span>{file.fileName}</span>;
          })}
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
            />
            <div className="h-4"></div>
            <Button type="submit">Ask changelog.ai</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuestionCard;
