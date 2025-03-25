"use client";
import * as z from "zod";
import Heading from "@/components/heading";
import { MessageSquare } from "lucide-react";
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
import { db } from "@/configs/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useUser } from "@clerk/nextjs";

function ConversationPage() {
  type ChatMessage = ChatCompletionMessageParam & {
    firestoreId: string; // ✅ Adding the missing property correctly
  };

  const router = useRouter();
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const deleteMessage = async (firestoreId: string) => {
    try {
      await axios.delete(`/api/conversation?firestoreId=${firestoreId}`);
      setMessages((prev) =>
        prev.filter((msg) => msg.firestoreId !== firestoreId)
      );
      fetchConversations();
    } catch (error) {
      console.error("Error Deleting Message:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const userId = user?.id;
      if (!userId) return;

      // Fetch the latest document from Firestore
      const userDocRef = doc(db, "users", userId);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
        console.warn("User document does not exist.");
        setMessages([]); // Clear frontend state
        setLoading(false);
        return;
      }

      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        const conversations = userData?.conversations || [];

        let allMessages: ChatMessage[] = [];

        conversations.forEach(
          (
            conversation: {
              messages: any[];
              response: ChatCompletionMessageParam;
            },
            conversationIndex: any
          ) => {
            if (conversation.messages && Array.isArray(conversation.messages)) {
              conversation.messages.forEach((msg, messageIndex) => {
                allMessages.push({
                  ...msg,
                  firestoreId: `${conversationIndex}-message-${messageIndex}`,
                });
              });
            }

            if (
              conversation.response &&
              typeof conversation.response === "object" &&
              conversation.response !== null
            ) {
              allMessages.push({
                ...(conversation.response as ChatCompletionMessageParam),
                firestoreId: `${conversationIndex}-response`,
              });
            }
          }
        );

        // Deduplicate based on role and content
        const uniqueMessages = Array.from(
          new Map(
            allMessages.map((message) => [
              `${message.role}-${message.content}`,
              message,
            ])
          ).values()
        );

        setMessages(uniqueMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
    setLoading(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userMessage: ChatCompletionMessageParam & { firestoreId: string } =
        {
          role: "user",
          content: values.prompt,
          firestoreId: `user-${Date.now()}`, // Generate unique ID
        };

      // Optimistically add the user's message to the state
      setMessages((current) => [...current, userMessage]);

      // Prepare the messages payload for the backend
      const newMessages = [...messages, userMessage];

      // Send the request to the backend
      const response = await axios.post("/api/conversation", {
        messages: newMessages,
      });

      // Create a new botMessage object with firestoreId
      const botMessage: ChatMessage = {
        ...response.data.message,
        firestoreId: `bot-${Date.now()}`,
      };

      // Append the bot's message to the state
      setMessages((current) => [...current, botMessage]);

      // Reset the form input after successful response
      form.reset();
    } catch (error) {
      console.error("Error in onSubmit:", error);
    }
  };

  return (
    <div className="text-2xl font-bold">
      <Heading
        title="Conversation"
        description="Our most advanced conversation model"
        icon={MessageSquare}
        iconColor="text-violet-500"
        bgColor="bg-violet-500/10"
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
                        className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                        disabled={isLoading}
                        placeholder="How do I calculate the radius of a circle?"
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

          {/* ✅ Show only when no messages exist */}
          {messages.length === 0 && !isLoading && (
            <div>
              <Empty label="No conversation started yet." />
            </div>
          )}

          {/* ✅ Show newly generated messages */}
          <div className="flex flex-col-reverse gap-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "w-full flex justify-between text-justify flex-items-start gap-x-8 rounded-lg",
                  message.role === "user"
                    ? "bg-white border py-2 px-4 border-black/10"
                    : "bg-muted p-4"
                )}
              >
                <div className="flex gap-4">
                  {message.role === "user" ? <UserAvatar /> : <BotAvatar />}
                  {/* <p className="text-sm my-auto">{message.content}</p> */}
                  <p className="text-sm my-auto">
                    {typeof message.content === "string"
                      ? message.content
                      : JSON.stringify(message.content)}
                  </p>
                </div>

                {/* ✅ Delete Button */}
                <div className="my-auto">
                  <button
                    onClick={() => deleteMessage(message.firestoreId)}
                    className="text-white border-2 bg-black rounded-lg px-2 hover:bg-white font-bold hover:text-red-700 cursor-pointer text-sm ml-auto h-[30px]"
                  >
                    <p>X</p>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationPage;
