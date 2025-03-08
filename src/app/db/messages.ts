import { UNKNOWN_VALUE } from "~/libs/sdk/constants.js";

export const randomWelcomeMessages = (username: string) => [
  `Welcome back, ${username}! Ready to pick up where you left off?`,
  `It's great to see you again, ${username}! Let's make something amazing today.`,
  `Nice to see you back, ${username}! Ready to conquer new challenges?`,
  `Hey ${username}, welcome back! Let's continue building something extraordinary.`,
  `Glad to have you back, ${username}! Time to work some development magic.`,
  `Look who's back! blefnk is in the house! Let's dive right back in.`,
  `${username}, good to see you again! Let's pick a goal and crush it together.`,
  `Welcome back to your dev journey, ${username}! The possibilities are endless.`,
];

export const randomWelcomeTitle = [
  "What would you like to create today? Consider me your versatile dev companion!",
  "Ready to craft something extraordinary? I've got all the tools you need!",
  "Let's transform your vision into reality! I'm here to help bring your ideas to life.",
  "Looking to kick off a new project? I've got everything you need to get started!",
  "What would you like to build today?",
  "Got a spark of inspiration? Let's turn it into a fully realized masterpiece!",
  "Time to bring your ideas into existence! What kind of project can I help you create?",
];

export const randomInitialMessage = [
  "Let's forge your brand-new digital creation from scratch! After that, you can mold it any way you like. Which category best describes your project?",
  "Time to breathe life into your vision! We'll start fresh and then you can customize everything. Which category suits your project best?",
  "Ready to shape something amazing? We'll build from the ground up, giving you total freedom. Which category fits your project best?",
  "Let's turn your concepts into reality! We'll begin at square one, and you'll have full creative control. Which category does your project fall under?",
  "Let's embark on a creative journey and build something completely new! Afterward, it's all yours to refine. What category best describes your project?",
];

export const randomProjectCategoryTitle = [
  "Fantastic choice! Let's dive deeper. Which category captures the essence of your project?",
  "Great direction! Now, let's pinpoint your focus. What type of project are you envisioning?",
  "Perfect step! To fine-tune your setup, could you clarify the specific type of development you have in mind?",
  "Excellent path! Let’s narrow it down further. Which of these categories aligns best with your vision?",
];

export const randomProjectFrameworkTitle = [
  "projectFramework time! Which foundation would you like to build upon?",
  "Great progress! Let's refine your stack. Which project framework best fits your project?",
  "Excellent choice! To set you up right, which project framework are you considering?",
  "Perfect! Let's zero in on your project framework preference. Which option resonates most with your plan?",
];

export const randomWebsiteSubcategoryTitle = [
  "Let's hone in on your site's purpose. Which sub-category best describes it?",
  "Good call! Now let's narrow it down further. What sub-category fits your website's focus?",
  "Excellent choice! To equip you well, which website sub-category are we aiming for?",
  "Perfect! Time to be specific. Which sub-category aligns most closely with your website vision?",
];

export const randomWebsiteDetailsTitle = [
  "Your initial plan is set! Now let’s personalize it. Please share some details about yourself and your app so I can tailor it to your style.",
  "Great choice! Let’s add a personal touch. Share a bit about yourself and the app, and I'll make it uniquely yours.",
  "Excellent! To set you up with the right finishing touches, could you provide more specific details about yourself and your app?",
  "Perfect! Let’s get more personal. Which details can you share so I can refine your website to truly match your vision?",
];

export function getWelcomeTitle(username: string) {
  return `🤖 ${
    username !== UNKNOWN_VALUE
      ? randomWelcomeMessages(username)[
          Math.floor(Math.random() * randomWelcomeMessages(username).length)
        ]
      : ""
  } ${getRandomMessage("welcome")}`;
}

export function getRandomMessage(
  kind: "welcome" | "initial" | "category" | "subcategory" | "details",
) {
  if (kind === "welcome") {
    return (
      randomWelcomeTitle[
        Math.floor(Math.random() * randomWelcomeTitle.length)
      ] ?? ""
    );
  } else if (kind === "initial") {
    return (
      randomInitialMessage[
        Math.floor(Math.random() * randomInitialMessage.length)
      ] ?? ""
    );
  }
  if (kind === "category") {
    return (
      randomProjectCategoryTitle[
        Math.floor(Math.random() * randomProjectCategoryTitle.length)
      ] ?? ""
    );
  }
  if (kind === "subcategory") {
    return (
      randomWebsiteSubcategoryTitle[
        Math.floor(Math.random() * randomWebsiteSubcategoryTitle.length)
      ] ?? ""
    );
  }
  if (kind === "details") {
    return (
      randomWebsiteDetailsTitle[
        Math.floor(Math.random() * randomWebsiteDetailsTitle.length)
      ] ?? ""
    );
  }
  return "";
}
