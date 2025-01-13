export const randomWelcomeMessages = (username: string) => [
  `Welcome back, ${username}! Ready to pick up where you left off?`,
  `It's great to see you again, ${username}! Let's make something amazing today.`,
  `Nice to see you back, ${username}! Ready to conquer new challenges?`,
  `Hey ${username}, welcome back! Let's continue building something extraordinary.`,
  `Glad to have you back, ${username}! Time to work some development magic.`,
  `Look who has returned! ${username} is in the house! Let's dive right back in.`,
  `${username}, good to see you again! Let's pick a goal and crush it together.`,
  `Welcome back to your dev journey, ${username}! The possibilities are endless.`,
];

export const randomReliverseMenuTitle = [
  "What would you like to create today? Consider me your versatile dev companion!",
  "Ready to craft something extraordinary? I've got all the tools you need!",
  "Let's transform your vision into reality! I'm here to help bring your ideas to life.",
  "Looking to kick off a new project? I've got everything you need to get started!",
  "Welcome to your development adventure! What shall we build together today?",
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

export const randomDevProjectTypeTitle = [
  "Fantastic choice! Let's dive deeper. Which subcategory captures the essence of your project?",
  "Great direction! Now, let's pinpoint your focus. What type of project are you envisioning?",
  "Perfect step! To fine-tune your setup, could you clarify the specific type of development you have in mind?",
  "Excellent path! Let’s narrow it down further. Which of these categories aligns best with your vision?",
];

export const randomWebsiteSubcategoryTitle = [
  "Let's refine your vision. What kind of website are you looking to build?",
  "Great decision! Now, let's specify further. What type of website do you have in mind?",
  "Excellent start! To equip you properly, could you tell me more about the type of website you're aiming for?",
  "Perfect! Let's get more granular. Which category best describes your intended website?",
];

export const randomProjectFrameworkTitle = [
  "projectFramework time! Which foundation would you like to build upon?",
  "Great progress! Let's refine your stack. Which projectFramework best fits your project?",
  "Excellent choice! To set you up right, which projectFramework are you considering?",
  "Perfect! Let's zero in on your projectFramework preference. Which option resonates most with your plan?",
];

export const randomWebsiteCategoryTitle = [
  "Let's hone in on your site's purpose. Which category best describes it?",
  "Good call! Now let's narrow it down further. What category fits your website's focus?",
  "Excellent choice! To equip you well, which website category are we aiming for?",
  "Perfect! Time to be specific. Which category aligns most closely with your website vision?",
];

export const randomWebsiteDetailsTitle = [
  "Your initial plan is set! Now let’s personalize it. Please share some details about yourself and your app so I can tailor it to your style.",
  "Great choice! Let’s add a personal touch. Share a bit about yourself and the app, and I'll make it uniquely yours.",
  "Excellent! To set you up with the right finishing touches, could you provide more specific details about yourself and your app?",
  "Perfect! Let’s get more personal. Which details can you share so I can refine your website to truly match your vision?",
];

// export const randomEndMessage = [
// "https://docs.reliverse.org/reliverse/cli",
// ];

export function getWelcomeTitle(username: string) {
  return `🤖 ${
    username && username !== ""
      ? randomWelcomeMessages(username)[
          Math.floor(Math.random() * randomWelcomeMessages(username).length)
        ]
      : ""
  } ${
    randomReliverseMenuTitle[
      Math.floor(Math.random() * randomReliverseMenuTitle.length)
    ]
  }`;
}
