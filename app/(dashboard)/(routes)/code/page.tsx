"use client";
import * as z from "zod";
import Heading from "@/components/heading";
import { Code, Divide } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { formSchema } from "./constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avatar";
import ReactMarkdown from "react-markdown";

function CodePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);
  const [history, setHistory] = useState<any[]>([]); // State to store history

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const [renderKey, setRenderKey] = useState(0);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userMessage: ChatCompletionMessageParam & { firestoreId: string } =
        {
          role: "user",
          content: values.prompt,
          firestoreId: `user-${Date.now()}`,
        };

      const newMessages = [...messages, userMessage];

      const response = await axios.post("/api/code", {
        messages: newMessages,
      });

      const botMessage: ChatCompletionMessageParam & { firestoreId: string } = {
        ...response.data,
        firestoreId: `bot-${Date.now()}`, // Generate firestoreId
      };

      setMessages((current) => [botMessage, userMessage, ...current]);

      // setMessages((current) => [...current, userMessage, response.data]);
      // setMessages((current) => [response.data, userMessage, ...current]);

      form.reset();
    } catch (error: any) {
      console.log(error);
    }
  };

  useEffect(() => {
    setRenderKey((prevKey) => prevKey + 1); // Force re-render when messages change
    fetchHistory();
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get("/api/code");
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const deleteCode = async (codeId: string) => {
    console.log("Deleting code with ID:", codeId); // Verify codeId
    try {
      await axios.delete(`/api/code?codeId=${codeId}`);
      setHistory((prev) => prev.filter((item) => item.id !== codeId));
    } catch (error: any) {
      console.error(
        "Error deleting code:",
        error.response?.data || error.message
      );
    }
  };

  return (
    <div className="text-justify font-md">
      <Heading
        title="Code Generation"
        description="Generate code using descriptive text."
        icon={Code}
        iconColor="text-green-700"
        bgColor="bg-green-700/10"
      />
      <div className="px-4 lg:px-8">
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2"
            >
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem className="col-span-12 lg:col-span-10">
                    <FormControl className="m-0 p-0">
                      <Input
                        className="border-0 text-xl outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                        disabled={isLoading}
                        placeholder="Simple toggle button using react hooks."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                className="col-span-12 cursor-pointer lg:col-span-2 w-full"
                disabled={isLoading}
                variant="default"
                size="lg"
              >
                Generate
              </Button>
            </form>
          </Form>
        </div>
        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
              <Loader />
            </div>
          )}
          {history.length === 0 && messages.length === 0 && !isLoading && (
            <div>
              <Empty label="No conversation started yet." />
            </div>
          )}
          <div className="flex flex-col-reverse gap-y-4">
            {/* Display messages from current session */}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "p-2 w-full flex flex-items-start gap-x-8 rounded-lg",
                  message.role === "user"
                    ? "bg-white border px-4 border-black/10 text-lg"
                    : "bg-muted flex flex-col text-sm overflow-hidden leading-7"
                )}
              >
                {message.role === "user" ? <UserAvatar /> : <BotAvatar />}
                <ReactMarkdown
                  components={{
                    pre: ({ node, ...props }) => (
                      <div className="overflow-auto w-full my-2 bg-black/10 p-2 rounded-lg">
                        <pre {...props} />
                      </div>
                    ),
                    code: ({ node, ...props }) => (
                      <code className="bg-black/10 rounded-lg p-1" {...props} />
                    ),
                  }}
                >
                  {String(message.content || "")}
                </ReactMarkdown>
              </div>
            ))}

            {/* Display messages from history */}
            {history.map((item) =>
              item.messages.map(
                (message: ChatCompletionMessageParam, index: number) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={cn(
                      "p-2 w-full flex flex-items-start gap-x-8 rounded-lg",
                      message.role === "user"
                        ? "bg-white border px-4 border-black/10 text-lg"
                        : "bg-muted flex flex-col text-sm overflow-hidden leading-7"
                    )}
                  >
                    {message.role === "user" ? <UserAvatar /> : <BotAvatar />}
                    <ReactMarkdown
                      components={{
                        pre: ({ node, ...props }) => (
                          <div className="overflow-auto w-full my-2 bg-black/10 p-2 rounded-lg">
                            <pre {...props} />
                          </div>
                        ),
                        code: ({ node, ...props }) => (
                          <code
                            className="bg-black/10 rounded-lg p-1"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {String(message.content || "")}
                    </ReactMarkdown>
                    <button
                      onClick={() => deleteCode(item.id)} // Add delete button
                      className="text-white border-2 bg-black rounded-lg px-2 hover:bg-white font-bold hover:text-red-700 cursor-pointer text-sm ml-auto h-[30px]"
                    >
                      <p>X</p>
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodePage;
