"use client";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import useProject from "~/hooks/use-project";
import { api } from "~/trpc/react";
import AskQuestionCard from "../dashboard/ask-question-card";
import MDEditor from "@uiw/react-md-editor";
import CodeReferences from "../dashboard/code-references";
import { cn } from "~/lib/utils";

const QAPage = () => {
  const leftRoundedSheet = "rounded-l-lg rounded-r-none";
  const { projectId } = useProject();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const question = questions?.[questionIndex];
  return (
    <Sheet>
      <AskQuestionCard />
      <div className="h-4"></div>
      <h1 className="text-xl font-semibold">Saved Questions</h1>
      <div className="h-2"></div>
      <div className="flex flex-col gap-2">
        {questions?.map((question, index) => {
          return (
            <React.Fragment key={question.id}>
              <SheetTrigger onClick={() => setQuestionIndex(index)}>
                <div className="shadow-border flex items-center gap-4 rounded-lg bg-white p-4">
                  <img
                    className="rounded-full"
                    height={30}
                    width={30}
                    src={question.user.imageUrl ?? ""}
                  />
                  <div className="flex gap-2 text-left">
                    <div className="flex items-center gap-2">
                      <p className="line-clamp-1 text-lg font-medium text-gray-700"></p>
                      <span className="text-xs whitespace-nowrap text-gray-900">
                        {question.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-md line-clamp-1 text-gray-700">
                      {question.question}
                    </p>
                  </div>
                </div>
              </SheetTrigger>
            </React.Fragment>
          );
        })}
      </div>
      {question && (
        <SheetContent className={cn("sm:max-w-[70vw]", leftRoundedSheet)}>
          <SheetHeader>
            <SheetTitle className="text-2xl">{question.question}</SheetTitle>
            <div data-color-mode="light">
              <MDEditor.Markdown
                className="max-h-[45vh] overflow-scroll"
                source={question.answer}
              />
            </div>
            <CodeReferences
              filesReference={question.filesReferences ?? ([] as any)}
            />
          </SheetHeader>
        </SheetContent>
      )}
    </Sheet>
  );
};

export default QAPage;
