"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { cn } from "~/lib/utils";
import { darkula } from "react-syntax-highlighter/dist/cjs/styles/hljs";

type Props = {
  filesReference: { fileName: string; sourceCode: string; summary: string }[];
};

const CodeReferences = ({ filesReference }: Props) => {
  const [tab, setTab] = React.useState(filesReference[0]?.fileName); // State to manage the active tab

  if (filesReference.length === 0) return null;

  return (
    <div className="max-w-[70vw]">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex gap-2 overflow-scroll rounded-md bg-gray-200 p-1">
          {filesReference.map((file) => (
            <button
              onClick={() => setTab(file.fileName)}
              key={file.fileName}
              className={cn(
                "text-muted-foreground hover:bg-muted rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                {
                  "bg-primary text-primary-foreground": tab === file.fileName,
                },
              )}
            >
              {file.fileName}
            </button>
          ))}
        </div>
        {filesReference.map((file) => (
          <TabsContent
            key={file.fileName}
            value={file.fileName}
            className="max-h-[40vh] max-w-7xl overflow-auto rounded-md"
          >
            <SyntaxHighlighter language="typescript" style={darkula}>
              {file.sourceCode}
            </SyntaxHighlighter>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CodeReferences;
