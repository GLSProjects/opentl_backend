const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// @desc    Chat with AI assistant
// @route   POST /api/chatbot
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: "Messages array is required" 
      });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-actual-openai-api-key-here') {
      // Fallback response when API key is not configured
      const fallbackResponse = generateSmartResponse(lastUserMessage);
      return res.json({ 
        response: fallbackResponse,
        model: "smart-fallback",
        setup_required: true
      });
    }

    // Try OpenAI API first
    try {
      // Validate messages format
      const isValidMessages = messages.every(msg => 
        msg.role && 
        msg.content && 
        ["user", "assistant", "system"].includes(msg.role)
      );

      if (!isValidMessages) {
        return res.status(400).json({ 
          error: "Invalid message format" 
        });
      }

      // Create system message
      const systemMessage = {
        role: "system",
        content: `You are a helpful AI assistant integrated into OpenTL, a modern communication platform. 
        You should be:
        - Helpful and friendly
        - Knowledgeable about programming, technology, and general topics
        - Concise but thorough
        - Professional yet approachable
        - Able to help with coding, writing, analysis, and problem-solving
        
        Respond in a conversational manner and provide practical, actionable advice when appropriate.`
      };

      // Prepare messages for OpenAI
      const apiMessages = [systemMessage, ...messages];

      // Make request to OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: apiMessages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      });

      const response = completion.choices[0].message.content;

      res.json({ 
        response: response,
        model: completion.model,
        usage: completion.usage
      });

    } catch (openaiError) {
      console.log("OpenAI API failed, using smart fallback:", openaiError.message);
      
      // If OpenAI fails (rate limit, etc.), use smart fallback
      const smartResponse = generateSmartResponse(lastUserMessage);
      
      res.json({ 
        response: smartResponse,
        model: "smart-fallback",
        fallback_reason: "Using smart assistant mode"
      });
    }

  } catch (error) {
    console.error("Chatbot API Error:", error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(500).json({ 
        error: "Invalid API key. Please check your OpenAI configuration.",
        setup_required: true
      });
    }
    
    if (error.status === 429) {
      // For rate limiting, provide a smart response instead of error
      const smartResponse = generateSmartResponse(lastUserMessage);
      return res.json({ 
        response: smartResponse,
        model: "smart-fallback",
        fallback_reason: "Using smart assistant mode"
      });
    }

    res.status(500).json({ 
      error: "Failed to process your request. Please try again." 
    });
  }
});

// Smart fallback response generator
function generateSmartResponse(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Handle greetings and simple interactions
  if (message.includes('hi') || message.includes('hello') || message.includes('hey') || message.includes('hii')) {
    return `👋 Hello! I'm your AI assistant, ready to help with any question or topic!

I can assist you with:
- **Health & Fitness**: Workout plans, nutrition, mental wellness
- **Personal Finance**: Budgeting, investing, saving strategies  
- **Travel**: Trip planning, destinations, packing tips
- **Learning**: Study techniques, skill development, education
- **Relationships**: Communication, dating, friendship advice
- **Career**: Resume help, interview prep, professional growth
- **Cooking**: Recipes, kitchen tips, meal planning
- **Technology**: Gadgets, troubleshooting, digital security
- **And much more!**

What would you like help with today? Just ask me anything! 🌟`;
  }

  // Handle "how are you" and similar
  if (message.includes('how are you') || message.includes('how are you doing') || message.includes('how are you feeling')) {
    return `😊 I'm doing great, thanks for asking! I'm here and ready to help you with any questions or challenges you have.

Whether you need help with:
- Learning a new skill
- Solving a technical problem
- Planning a trip
- Managing stress
- Career advice
- Or anything else!

I'm excited to assist you. What's on your mind today? 🚀`;
  }

  // Handle "what can you do" type questions
  if (message.includes('what can you do') || message.includes('what do you do') || message.includes('help me with')) {
    return `🤖 I'm your universal AI assistant! I can help you with virtually any topic or question:

**Popular Topics I Help With**:
- 💪 **Health**: Workout plans, nutrition, mental wellness
- 💰 **Finance**: Budgeting, investing, saving money
- ✈️ **Travel**: Trip planning, destinations, packing
- 📚 **Learning**: Study tips, skill development, education
- 💝 **Relationships**: Communication, dating, friendship
- 💼 **Career**: Resume help, interviews, professional growth
- 👨‍🍳 **Cooking**: Recipes, kitchen tips, meal prep
- 📱 **Tech**: Gadgets, troubleshooting, digital security
- 🧠 **Life Advice**: Happiness, meaning, personal growth
- 🔧 **Programming**: Coding help, web development, debugging

**Just ask me anything!** For example:
- "How do I start exercising?"
- "What's a good budget for $50k salary?"
- "Help me plan a trip to Japan"
- "How do I learn Spanish quickly?"

What would you like help with? I'm ready to provide detailed solutions! 🌟`;
  }

  // Health and fitness
  if (message.includes('health') || message.includes('fitness') || message.includes('exercise') || message.includes('diet') || message.includes('weight')) {
    return `🏃‍♂️ **Health & Fitness Guide**:

**Getting Started with Fitness**:
1. **Set Clear Goals**: Define what you want to achieve (weight loss, muscle gain, endurance)
2. **Create a Schedule**: Aim for 150 minutes of moderate exercise per week
3. **Start Slow**: Begin with 20-30 minutes, 3 times per week

**Effective Workout Types**:
\`\`\`javascript
// Weekly workout schedule example
const weeklyPlan = {
  monday: 'Cardio - 30 min running or cycling',
  tuesday: 'Strength - Upper body (push-ups, pull-ups, weights)',
  wednesday: 'Rest or light yoga',
  thursday: 'Cardio - HIIT 20 min',
  friday: 'Strength - Lower body (squats, lunges, deadlifts)',
  saturday: 'Active recovery - walking or swimming',
  sunday: 'Rest'
};
\`\`\`

**Nutrition Basics**:
- **Protein**: 0.8g per kg body weight for muscle maintenance
- **Hydration**: 8 glasses of water daily minimum
- **Balanced Diet**: 40% carbs, 30% protein, 30% fats
- **Meal Timing**: Eat every 3-4 hours to maintain metabolism

**Common Fitness Goals**:
- **Weight Loss**: Calorie deficit of 500 calories/day
- **Muscle Gain**: Calorie surplus + resistance training
- **Endurance**: Progressive cardio overload
- **Flexibility**: Daily stretching + yoga

**Tracking Progress**:
- Take measurements weekly
- Progress photos monthly
- Track workouts in an app or journal
- Monitor energy levels and sleep quality

What specific health or fitness goal are you working toward? 🎯`;
  }

  // Finance and money
  if (message.includes('money') || message.includes('finance') || message.includes('invest') || message.includes('budget') || message.includes('saving')) {
    return `💰 **Personal Finance & Investment Guide**:

**Building Your Financial Freedom**:

**1. Emergency Fund (Your Top Priority!)**:
This is your safety net for unexpected expenses. Here's how to build it:

- **Calculate your monthly expenses**: Add up everything you spend in a month (rent, food, utilities, etc.)
- **Multiply by 6**: This gives you 6 months of expenses as your emergency fund goal
- **Example**: If you spend $3000/month, aim for $18,000 emergency fund
- **Save strategy**: Put aside $500/month and you'll reach your goal in 36 months

**Why this matters**: When life happens (job loss, medical bills, car repairs), you won't go into debt!

**2. The 50/30/20 Budget Rule**:
A simple way to manage your money:

- **50% for Needs**: Rent/mortgage, utilities, groceries, transportation
- **30% for Wants**: Entertainment, dining out, hobbies, shopping
- **20% for Savings**: Emergency fund, retirement, investments

**Real Example**: With a $4000 monthly income:
- $2000 for needs (rent, bills, groceries)
- $1200 for wants (restaurants, Netflix, gym)
- $800 for savings and investing

**3. Smart Investment Strategies by Age**:

**In Your 20s** (Aggressive Growth):
- 90% stocks, 10% bonds
- Focus on growth stocks and ETFs
- You have time to ride out market ups and downs
- Start with index funds (S&P 500, total market)

**In Your 30s** (Growth Focused):
- 80% stocks, 20% bonds
- Mix of growth and some stability
- Consider retirement accounts (401k, IRA)
- Start diversifying internationally

**In Your 40s** (Balanced Approach):
- 70% stocks, 30% bonds
- More stability as retirement gets closer
- Max out retirement contributions
- Consider dividend-paying stocks

**In Your 50s** (Capital Preservation):
- 60% stocks, 40% bonds
- Focus on preserving what you've built
- Plan your retirement income strategy
- Consider conservative growth funds

**4. Investment Options Explained Simply**:

**Index Funds**:
- Low fees (usually 0.1% or less)
- Track entire market (like S&P 500)
- Great for beginners
- Historically return 8-10% annually

**Individual Stocks**:
- Higher risk, potential higher returns
- Requires research and monitoring
- Only invest money you can afford to lose
- Start with companies you understand

**Real Estate**:
- Rental income (monthly cash flow)
- Property appreciation (long-term growth)
- Tax advantages
- Requires more management

**Bonds**:
- Lower risk, stable income
- Good for balancing portfolio risk
- Government bonds are safest
- Corporate bonds pay more interest

**5. Side Hustles to Boost Income**:

**Low Start-Up Cost**:
- Freelancing (writing, design, programming)
- Online tutoring or teaching
- Social media management
- Virtual assistant services

**Medium Investment**:
- E-commerce (dropshipping, handmade products)
- Content creation (YouTube, blogging)
- Online courses or coaching
- Mobile app development

**What's great about side hustles**: You can start small and build up. Even an extra $500/month adds up to $6000/year!

**6. Smart Debt Management**:

**Priority Order**:
1. Credit card debt (18-25% interest) - Pay this FIRST
2. Personal loans (10-15% interest)
3. Student loans (5-8% interest)
4. Mortgage (3-6% interest)

**Debt Payoff Strategy**:
- Make minimum payments on all debts
- Put extra money toward highest-interest debt
- Once that's paid, roll that payment to the next debt
- This "debt snowball" saves thousands in interest

**7. Before You Start Investing**:
- Build that emergency fund first
- Pay off high-interest credit card debt
- Make sure you're contributing to retirement accounts at work
- Start small ($50-100/month is fine to begin!)

**The key is starting now, not waiting for the "perfect" time. Even small amounts compound dramatically over time!**

**What's your current financial situation or goal? I can give you specific advice!** 📊`;
  }

  // Travel and lifestyle
  if (message.includes('travel') || message.includes('vacation') || message.includes('trip') || message.includes('holiday')) {
    return `✈️ **Travel Planning & Lifestyle Guide**:

**Planning Your Perfect Trip**:

**1. Budget Planning Made Simple**:
Let me help you calculate your travel budget! For a typical trip, you'll need:

- **Flights**: Usually $300-1200 depending on destination
- **Accommodation**: $50-200 per night (hotels, Airbnb, hostels)
- **Food**: $30-100 per day (mix of restaurants and local food)
- **Activities**: $20-80 per day (tours, attractions, experiences)
- **Shopping**: $100-500 for souvenirs and extras
- **Emergency Fund**: Always add $200-500 for unexpected costs

**Smart Saving Tip**: If you save $200 per month, a $3000 trip takes 15 months to save for. Start early and watch for flight deals!

**2. Amazing Travel Destinations**:

**Budget-Friendly (Under $50/day)**:
- **Thailand**: Incredible street food ($1-3 per meal), beautiful beaches, friendly locals
- **Portugal**: Affordable Western Europe, stunning coastline, rich history
- **Mexico**: Amazing value, diverse landscapes from beaches to mountains
- **Vietnam**: $20-30/day total, delicious pho, beautiful countryside

**Mid-Range ($50-150/day)**:
- **Japan**: Super efficient trains, incredible food, very safe, unique culture
- **Spain**: Beautiful beaches, vibrant nightlife, amazing tapas culture
- **Greece**: Stunning islands, ancient history, Mediterranean lifestyle
- **Morocco**: Exotic markets, Sahara desert, riads, mint tea

**Luxury Experiences ($150+/day)**:
- **Switzerland**: Breathtaking Alps, luxury trains, pristine nature
- **Dubai**: Modern architecture, luxury shopping, desert safaris
- **Maldives**: Overwater bungalows, crystal clear water, pure relaxation

**3. Travel Hacks That Save Money**:

**Flight Savings**:
- Book flights on Tuesday or Wednesday (usually 15-20% cheaper)
- Use incognito mode when searching (prevents price tracking)
- Clear browser cookies before booking
- Consider nearby airports (sometimes much cheaper)

**Accommodation Tips**:
- Airbnb for stays over 5 days (usually cheaper than hotels)
- Hostels for budget travel (great for meeting other travelers)
- House-sitting websites for free stays
- Last-minute hotel apps for deals

**Food & Transport**:
- Eat at local markets (authentic and cheap)
- Get city transit passes (unlimited travel)
- Walk whenever possible (free and you see more!)
- Grocery stores for some meals (saves $20-40/day)

**4. Digital Nomad Essentials**:

**Must-Have Tech**:
- Laptop with good battery life
- Noise-cancelling headphones (lifesaver in cafes)
- Portable power bank (charge anywhere)
- Universal travel adapter

**Important Documents**:
- Passport (valid 6+ months beyond travel)
- Visas (check requirements beforehand!)
- Travel insurance (absolutely essential)
- International driving permit if needed
- Digital copies of everything

**Money Management**:
- Credit cards with no foreign transaction fees
- $200-500 emergency cash in local currency
- Budget tracking app on your phone
- Notify your bank of travel dates

**5. Smart Packing Strategies**:

**Space-Saving Tips**:
- Roll clothes instead of folding (saves 30% space)
- Use packing cubes (keeps everything organized)
- Wear your heaviest shoes on travel days
- Pack essentials in carry-on only

**Don't Forget**:
- Universal adapter for electronics
- Basic first-aid kit
- Reusable water bottle (save money and environment)
- Portable charger (phone always dying when traveling!)

**My Top Travel Tip**: Start planning 3-6 months ahead for international trips. This gives you time to find the best deals, get any needed visas, and save money without stress!

**What destination are you dreaming about? I can give you specific tips for anywhere you want to go!** 🌍`;
  }

  // Education and learning
  if (message.includes('learn') || message.includes('study') || message.includes('education') || message.includes('course') || message.includes('skill')) {
    return `📚 **Learning & Education Guide**:

**Effective Learning Strategies**:

**1. Learning Methods**:
\`\`\`javascript
// Spaced repetition schedule
const learningSchedule = {
  day1: 'Learn new concept',
  day2: 'Review day1 material',
  day4: 'Review day1 material',
  day7: 'Review day1 material',
  day14: 'Review day1 material',
  day30: 'Review day1 material'
};
\`\`\`

**2. Skill Acquisition Framework**:
- **Deconstruct**: Break skill into smallest components
- **Learn**: Focus on one sub-skill at a time
- **Practice**: Deliberate practice with feedback
- **Integrate**: Combine sub-skills into complete skill

**3. Online Learning Resources**:
\`\`\`javascript
// Learning platforms by category
const learningPlatforms = {
  programming: ['freeCodeCamp', 'Codecademy', 'LeetCode', 'Coursera'],
  business: ['Harvard Business School Online', 'LinkedIn Learning', 'Udemy'],
  creative: ['Skillshare', 'Domestika', 'CreativeLive'],
  languages: ['Duolingo', 'Babbel', 'iTalki', 'Pimsleur'],
  academic: ['Khan Academy', 'edX', 'Coursera', 'MIT OpenCourseWare']
};
\`\`\`

**4. Memory Techniques**:
- **Spaced Repetition**: Review at increasing intervals
- **Active Recall**: Test yourself instead of re-reading
- **Feynman Technique**: Explain concepts in simple terms
- **Mind Palaces**: Associate information with locations

**5. Study Schedule Optimization**:
\`\`\`javascript
// Optimal study times
const studySchedule = {
  morning: 'Creative work, problem-solving (9-11 AM)',
  afternoon: 'Detail-oriented tasks, memorization (2-4 PM)',
  evening: 'Review, light reading (7-9 PM)',
  notes: 'Take breaks every 25 minutes (Pomodoro)'
};
\`\`\`

**Popular Skills to Learn**:
- **Technical**: Programming, data science, AI/ML
- **Creative**: Design, writing, music production
- **Business**: Marketing, finance, entrepreneurship
- **Languages**: Spanish, Mandarin, French, Arabic
- **Practical**: Cooking, DIY, public speaking

**Learning Milestones**:
- **Week 1**: Basic concepts and terminology
- **Month 1**: Fundamental skills and practice
- **Month 3**: Intermediate proficiency
- **Month 6**: Advanced applications
- **Year 1**: Expert level capability

What skill or subject are you interested in learning? 🎓`;
  }

  // Relationships and communication
  if (message.includes('relationship') || message.includes('communication') || message.includes('friend') || message.includes('social') || message.includes('dating')) {
    return `💝 **Relationships & Communication Guide**:

**Building Strong Connections**:

**1. Effective Communication**:
\`\`\`javascript
// Communication framework
const communicationTips = {
  listening: 'Listen more than you speak (80/20 rule)',
  questions: 'Ask open-ended questions (what, how, why)',
  validation: 'Acknowledge feelings before solving problems',
  timing: 'Choose the right time for important conversations',
  bodyLanguage: 'Maintain eye contact, open posture'
};
\`\`\`

**2. Friendship Building**:
- **Shared Interests**: Find common activities and hobbies
- **Quality Time**: Regular meaningful interactions
- **Support System**: Be there during good and bad times
- **Authenticity**: Be genuine and vulnerable
- **Reciprocity**: Give as much as you receive

**3. Conflict Resolution**:
\`\`\`javascript
// Conflict resolution steps
const resolveConflict = {
  step1: 'Cool down - wait until emotions settle',
  step2: 'Use "I" statements - "I feel" not "You always"',
  step3: 'Listen to understand, not to respond',
  step4: 'Find common ground and compromise',
  step5: 'Make a plan to prevent future issues'
};
\`\`\`

**4. Dating & Romantic Relationships**:
- **Self-Improvement**: Work on yourself first
- **Clear Intentions**: Be honest about what you want
- **Boundaries**: Know and communicate your limits
- **Shared Values**: Align on life goals and values
- **Growth Mindset**: Be willing to grow together

**5. Social Skills Development**:
\`\`\`javascript
// Social skills practice areas
const socialSkills = {
  conversation: [
    'Practice active listening',
    'Learn to tell engaging stories',
    'Master small talk',
    'Remember names and details'
  ],
  networking: [
    'Attend industry events',
    'Follow up within 24 hours',
    'Give before you take',
    'Maintain relationships'
  ],
  empathy: [
    'Practice perspective-taking',
    'Read emotional cues',
    'Validate others\' feelings',
    'Offer genuine support'
  ]
};
\`\`\`

**6. Digital Communication**:
- **Texting**: Balance responsiveness with availability
- **Social Media**: Curate positive online presence
- **Video Calls**: Maintain eye contact, minimize distractions
- **Email**: Professional tone, clear subject lines

**Red Flags to Watch For**:
- Disrespect for boundaries
- Lack of accountability
- Constant criticism
- Controlling behavior
- Emotional unavailability

What type of relationship or communication challenge are you facing? 💕`;
  }

  // Career and professional development
  if (message.includes('career') || message.includes('job') || message.includes('work') || message.includes('professional') || message.includes('resume')) {
    return `💼 **Career & Professional Development Guide**:

**Building a Successful Career**:

**1. Career Planning**:
\`\`\`javascript
// Career development roadmap
const careerPath = {
  entry: 'Learn fundamentals, gain experience',
  growth: 'Develop expertise, take on challenges',
  advancement: 'Leadership skills, strategic thinking',
  mastery: 'Innovation, mentoring, industry influence'
};
\`\`\`

**2. Resume & Cover Letter**:
\`\`\`javascript
// Resume optimization checklist
const resumeTips = {
  format: 'Clean, professional, 1-2 pages maximum',
  content: [
    'Quantify achievements (numbers, percentages)',
    'Use action verbs (led, created, improved)',
    'Tailor to job description keywords',
    'Include relevant skills and certifications'
  ],
  sections: [
    'Professional summary',
    'Work experience (reverse chronological)',
    'Education',
    'Skills & certifications',
    'Projects & achievements'
  ]
};
\`\`\`

**3. Interview Preparation**:
\`\`\`javascript
// Common interview questions framework
const interviewQuestions = {
  behavioral: [
    'Tell me about a time you faced a challenge',
    'Describe a situation where you led a team',
    'How do you handle conflict with colleagues?'
  ],
  technical: [
    'Problem-solving scenarios',
    'Technical skill assessments',
    'System design questions'
  ],
  situational: [
    'How would you handle...?',
    'What would you do if...?',
    'Describe your approach to...'
  ]
};
\`\`\`

**4. Networking Strategy**:
- **LinkedIn**: Complete profile, regular engagement
- **Industry Events**: Conferences, meetups, workshops
- **Informational Interviews**: Learn from professionals
- **Alumni Networks**: Leverage school connections
- **Professional Associations**: Join industry organizations

**5. Skill Development**:
\`\`\`javascript
// In-demand skills by industry
const skillsByIndustry = {
  tech: ['AI/ML', 'cloud computing', 'cybersecurity', 'data science'],
  business: ['data analysis', 'project management', 'digital marketing'],
  creative: ['UX design', 'content creation', 'video production'],
  healthcare: ['telemedicine', 'health informatics', 'patient care']
};
\`\`\`

**6. Salary Negotiation**:
- **Research**: Know market rates for your role/experience
- **Timing**: Negotiate after offer, before acceptance
- **Leverage**: Multiple offers, unique skills, experience
- **Total Compensation**: Base salary, bonus, benefits, equity
- **Practice**: Role-play negotiation scenarios

**7. Work-Life Balance**:
\`\`\`javascript
// Balance optimization strategies
const workLifeBalance = {
  boundaries: 'Set clear work hours and stick to them',
  priorities: 'Focus on high-impact activities',
  selfCare: 'Regular exercise, hobbies, social time',
  efficiency: 'Time blocking, minimize distractions',
  flexibility: 'Remote work options, flexible scheduling'
};
\`\`\`

**Career Change Considerations**:
- **Assessment**: Skills, interests, market demand
- **Planning**: Education, certification, transition timeline
- **Networking**: Connect with people in target industry
- **Experience**: Freelance, volunteer, side projects
- **Finance**: Savings cushion during transition

What career challenge or goal are you working on? 🚀`;
  }

  // Mental health and wellness
  if (message.includes('mental health') || message.includes('stress') || message.includes('anxiety') || message.includes('depression') || message.includes('mindfulness')) {
    return `🧠 **Mental Health & Wellness Guide**:

**Prioritizing Your Mental Well-being**:

**1. Stress Management**:
\`\`\`javascript
// Stress reduction techniques
const stressManagement = {
  immediate: [
    'Deep breathing (4-7-8 technique)',
    'Progressive muscle relaxation',
    'Quick walk or stretch',
    'Listen to calming music'
  ],
  daily: [
    'Morning meditation (5-10 minutes)',
    'Regular exercise (30 minutes)',
    'Journaling thoughts and feelings',
    'Limit social media exposure'
  ],
  weekly: [
    'Nature time (parks, hiking)',
    'Social connection with friends',
    'Hobby or creative activity',
    'Digital detox periods'
  ]
};
\`\`\`

**2. Anxiety Management**:
\`\`\`javascript
// Anxiety coping strategies
const anxietyTools = {
  grounding: '5-4-3-2-1 technique (sight, sound, touch, smell, taste)',
  breathing: 'Box breathing (4 in, 4 hold, 4 out, 4 hold)',
  thoughtChallenging: 'Question anxious thoughts, find evidence',
  exposure: 'Gradually face anxiety-provoking situations',
  lifestyle: 'Regular exercise, sleep hygiene, limit caffeine'
};
\`\`\`

**3. Building Resilience**:
- **Growth Mindset**: View challenges as learning opportunities
- **Social Support**: Maintain meaningful connections
- **Self-Compassion**: Treat yourself with kindness
- **Problem-Solving**: Focus on solutions, not problems
- **Flexibility**: Adapt to changing circumstances

**4. Daily Wellness Routine**:
\`\`\`javascript
// Optimal daily schedule for mental health
const wellnessSchedule = {
  morning: {
    wake: 'Consistent wake time (even weekends)',
    mindfulness: '10 minutes meditation or journaling',
    movement: '15 minutes stretching or walking',
    nutrition: 'Protein-rich breakfast, avoid screens'
  },
  day: {
    breaks: 'Every 2 hours, 5-minute mental break',
    movement: 'Walk during lunch, get sunlight',
    hydration: '8 glasses water throughout day',
    social: 'Positive interaction with colleague/friend'
  },
  evening: {
    windDown: 'No screens 1 hour before bed',
    reflection: '3 gratitudes from the day',
    preparation: 'Lay out clothes, plan tomorrow',
    sleep: '7-9 hours in cool, dark room'
  }
};
\`\`\`

**5. Professional Help Resources**:
\`\`\`javascript
// Mental health support options
const supportResources = {
  therapy: [
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Acceptance and Commitment Therapy (ACT)',
    'Psychodynamic therapy'
  ],
  support: [
    'Support groups (in-person/online)',
    'Hotlines for immediate crisis',
    'Community mental health centers',
    'Employee assistance programs (EAP)'
  ],
  selfHelp: [
    'Mental health apps (Calm, Headspace, BetterHelp)',
    'Self-help books and workbooks',
    'Online courses and workshops',
    'Mindfulness and meditation practices'
  ]
};
\`\`\`

**6. Healthy Lifestyle Habits**:
- **Sleep**: 7-9 hours, consistent schedule
- **Exercise**: 30 minutes moderate activity daily
- **Nutrition**: Balanced diet, limit processed foods
- **Social**: Regular meaningful connections
- **Purpose**: Engaging activities and goals

**7. Crisis Management**:
\`\`\`javascript
// Mental health crisis plan
const crisisPlan = {
  immediate: [
    'Call 988 (Suicide & Crisis Lifeline)',
    'Contact therapist or crisis line',
    'Remove means of self-harm',
    'Stay with trusted person'
  ],
  prevention: [
    'Therapy appointments',
    'Medication management',
    'Support network regular check-ins',
    'Crisis plan sharing with trusted contacts'
  ]
};
\`\`\`

**Important Note**: If you're experiencing severe mental health symptoms, please seek professional help immediately. Call 988 or contact a mental health professional.

What specific mental health challenge would you like support with? 💚`;
  }

  // Cooking and food
  if (message.includes('cook') || message.includes('recipe') || message.includes('food') || message.includes('meal') || message.includes('kitchen')) {
    return `👨‍🍳 **Cooking & Food Guide**:

**Mastering the Kitchen**:

**1. Essential Kitchen Equipment**:
\`\`\`javascript
// Must-have kitchen tools
const kitchenEssentials = {
  cookware: [
    'Non-stick skillet (10-12 inch)',
    'Saucepan (2-3 quart)',
    'Stock pot (6-8 quart)',
    'Baking sheet (13x9 inch)',
    'Dutch oven (5-7 quart)'
  ],
  tools: [
    'Chef\'s knife (8 inch)',
    'Cutting board',
    'Mixing bowls (set of 3)',
    'Measuring cups and spoons',
    'Whisk, spatula, ladle'
  ],
  appliances: [
    'Food processor or blender',
    'Stand mixer (optional but amazing)',
    'Instant pot or slow cooker',
    'Air fryer (game changer)'
  ]
};
\`\`\`

**2. Basic Cooking Techniques**:
\`\`\`javascript
// Cooking methods and when to use them
const cookingMethods = {
  sautéing: 'Quick cooking in small amount of fat, medium heat',
  roasting: 'Dry heat in oven, great for vegetables and meats',
  braising: 'Slow cooking in liquid, tenderizes tough cuts',
  grilling: 'High heat, smoky flavor, quick cooking',
  steaming: 'Gentle cooking, preserves nutrients',
  baking: 'Dry heat, precise temperature control'
};
\`\`\`

**3. Easy Recipes for Beginners**:

**One-Pot Pasta**:
\`\`\`
Ingredients:
- 1 lb pasta (penne or rigatoni)
- 1 can crushed tomatoes
- 1 onion, diced
- 3 cloves garlic, minced
- 4 cups water or broth
- 2 tbsp olive oil
- Salt, pepper, Italian seasoning

Instructions:
1. Heat oil in pot, sauté onion until soft (3-4 min)
2. Add garlic, cook 1 minute until fragrant
3. Add pasta, tomatoes, water, seasonings
4. Bring to boil, reduce heat, simmer 15-20 min
5. Stir occasionally, pasta should absorb liquid
6. Season to taste, add parmesan if desired
\`\`\`

**Sheet Pan Chicken**:
\`\`\`
Ingredients:
- 4 chicken breasts
- 2 lbs mixed vegetables (broccoli, bell peppers, onions)
- 3 tbsp olive oil
- 2 tsp garlic powder
- 1 tsp paprika
- Salt and pepper

Instructions:
1. Preheat oven to 400°F (200°C)
2. Toss chicken and vegetables with oil and seasonings
3. Spread on baking sheet in single layer
4. Bake 25-30 minutes until chicken cooked through
5. Serve with rice or quinoa
\`\`\`

**4. Meal Prep Strategy**:
\`\`\`javascript
// Weekly meal prep plan
const mealPrep = {
  sunday: [
    'Cook grains (rice, quinoa) for week',
    'Prep vegetables (chop, roast)',
    'Batch cook proteins (chicken, beans)',
    'Make dressings and sauces'
  ],
  daily: [
    'Assemble meals in 5-10 minutes',
    'Mix and match prepped components',
    'Add fresh ingredients daily',
    'Minimize cooking time during week'
  ]
};
\`\`\`

**5. Kitchen Safety & Tips**:
- **Knife Skills**: Keep fingers curled under, use claw grip
- **Food Safety**: Keep hot foods hot, cold foods cold
- **Cross-Contamination**: Separate cutting boards for meat/veg
- **Temperature**: Use meat thermometer for accuracy
- **Cleaning**: Clean as you go, sanitize surfaces

**6. Flavor Building**:
\`\`\`javascript
// Flavor combination guide
const flavorProfiles = {
  italian: 'Basil, oregano, garlic, olive oil, tomatoes',
  mexican: 'Cumin, chili powder, cilantro, lime, onions',
  asian: 'Soy sauce, ginger, garlic, sesame, scallions',
  indian: 'Cumin, coriander, turmeric, garam masala',
  mediterranean: 'Olive oil, lemon, oregano, garlic, feta'
};
\`\`\`

**7. Cooking Time Guidelines**:
\`\`\`javascript
// Approximate cooking times
const cookingTimes = {
  chicken: {
    breast: '25-30 min at 350°F',
    thighs: '35-45 min at 350°F',
    whole: '1.5-2 hours at 350°F'
  },
  vegetables: {
    root: '40-60 min (roasted)',
    leafy: '5-10 min (sautéed)',
    cruciferous: '15-25 min (roasted)'
  },
  grains: {
    rice: '15-20 min (simmered)',
    quinoa: '12-15 min (simmered)',
    pasta: '8-12 min (boiled)'
  }
};
\`\`\`

What type of cooking or recipe help do you need? 🍽️`;
  }

  // Technology and gadgets
  if (message.includes('technology') || message.includes('gadget') || message.includes('smartphone') || message.includes('computer') || message.includes('tech')) {
    return `📱 **Technology & Gadgets Guide**:

**Navigating the Tech World**:

**1. Smartphone Optimization**:
\`\`\`javascript
// Essential smartphone setup
const phoneOptimization = {
  security: [
    'Enable face/fingerprint unlock',
    'Use strong passcode',
    'Enable two-factor authentication',
    'Regular software updates'
  ],
  battery: [
    'Optimize battery settings',
    'Reduce background app refresh',
    'Lower screen brightness',
    'Use dark mode when possible'
  ],
  storage: [
    'Clear cache regularly',
    'Delete unused apps',
    'Use cloud storage for photos',
    'Offload old files to computer/cloud'
  ]
};
\`\`\`

**2. Computer Performance**:
\`\`\`javascript
// PC maintenance checklist
const computerCare = {
  daily: [
    'Close unused applications',
    'Clear browser cache',
    'Run malware scan',
    'Backup important files'
  ],
  weekly: [
    'Disk cleanup and defragmentation',
    'Update software and drivers',
    'Organize desktop and files',
    'Check storage space'
  ],
  monthly: [
    'Deep clean dust from fans/vents',
    'Review startup programs',
    'Update antivirus definitions',
    'Check system health'
  ]
};
\`\`\`

**3. Smart Home Setup**:
\`\`\`javascript
// Smart home ecosystem options
const smartHome = {
  hubs: ['Amazon Alexa', 'Google Home', 'Apple HomeKit'],
  devices: [
    'Smart speakers and displays',
    'Smart lighting (Philips Hue, Wyze)',
    'Smart thermostats (Nest, Ecobee)',
    'Security cameras (Ring, Arlo)',
    'Smart plugs and switches'
  ],
  automation: [
    'Lighting schedules',
    'Temperature control',
    'Security routines',
    'Energy monitoring'
  ]
};
\`\`\`

**4. Tech Buying Guide**:
\`\`\`javascript
// Tech purchase decision framework
const techBuying = {
  research: [
    'Read professional reviews',
    'Check user feedback and ratings',
    'Compare specifications',
    'Consider long-term support'
  ],
  budget: [
    'Set realistic budget range',
    'Consider total cost of ownership',
    'Look for student/military discounts',
    'Time purchases around sales events'
  ],
  compatibility: [
    'Check ecosystem compatibility',
    'Consider future upgrade paths',
    'Verify accessory availability',
    'Assess software requirements'
  ]
};
\`\`\`

**5. Digital Security**:
\`\`\`javascript
// Personal cybersecurity checklist
const securityMeasures = {
  passwords: [
    'Use unique passwords for each account',
    'Enable password manager (1Password, LastPass)',
    'Use two-factor authentication',
    'Create security questions with memorable answers'
  ],
  privacy: [
    'Review social media privacy settings',
    'Use VPN on public WiFi',
    'Be cautious with app permissions',
    'Regularly review connected devices'
  ],
  data: [
    'Backup to cloud and external drives',
    'Enable encryption for sensitive files',
    'Use secure messaging apps',
    'Regular security audits'
  ]
};
\`\`\`

**6. Productivity Tech Tools**:
\`\`\`javascript
// Digital productivity suite
const productivityTools = {
  noteTaking: ['Notion', 'Evernote', 'OneNote', 'Bear'],
  taskManagement: ['Todoist', 'Asana', 'Trello', 'Things'],
  focus: ['Forest', 'RescueTime', 'Freedom', 'Cold Turkey'],
  automation: ['IFTTT', 'Zapier', 'Shortcuts', 'Automator']
};
\`\`\`

**7. Troubleshooting Common Issues**:
\`\`\`javascript
// Tech problem-solving flowchart
const troubleshooting = {
  step1: 'Restart device (solves 50% of issues)',
  step2: 'Check connections and cables',
  step3: 'Update software/drivers',
  step4: 'Clear cache and temporary files',
  step5: 'Run diagnostic tools',
  step6: 'Search for specific error codes',
  step7: 'Contact professional support'
};
\`\`\`

**8. Emerging Technologies**:
- **AI/ML**: Machine learning, natural language processing
- **IoT**: Internet of Things, connected devices
- **5G**: Faster mobile connectivity
- **AR/VR**: Augmented and virtual reality
- **Blockchain**: Decentralized technology
- **Quantum Computing**: Next-gen processing power

What technology challenge or question do you have? 🖥️`;
  }

  // Philosophy and life advice
  if (message.includes('meaning') || message.includes('purpose') || message.includes('life') || message.includes('happiness') || message.includes('philosophy')) {
    return `🌟 **Life Philosophy & Personal Growth Guide**:

**Finding Meaning and Purpose**:

**1. Core Values Discovery**:
\`\`\`javascript
// Values identification exercise
const lifeValues = {
  categories: [
    'Relationships (family, friends, community)',
    'Growth (learning, challenge, development)',
    'Contribution (helping others, making impact)',
    'Experience (adventure, creativity, joy)',
    'Security (stability, health, comfort)',
    'Achievement (success, recognition, mastery)'
  ],
  exercise: [
    'Rate each category 1-10 in importance',
    'Identify top 3 core values',
    'Write specific examples of living these values',
    'Create action steps to align daily life with values'
  ]
};
\`\`\`

**2. Happiness Science**:
\`\`\`javascript
// Research-backed happiness factors
const happinessDrivers = {
  relationships: 'Strong social connections (#1 predictor)',
  purpose: 'Meaningful goals and contribution',
  gratitude: 'Regular appreciation practice',
  mindfulness: 'Present moment awareness',
  health: 'Physical exercise and sleep',
  generosity: 'Helping others activates reward centers',
  learning: 'Curiosity and skill development',
  nature: 'Time outdoors reduces stress'
};
\`\`\`

**3. Life Philosophy Frameworks**:

**Stoicism**:
- Focus on what you can control, accept what you cannot
- Practice negative visualization (appreciate what you have)
- View obstacles as opportunities for growth
- Live virtuously (wisdom, courage, justice, temperance)

**Existentialism**:
- Create your own meaning in a meaningless universe
- Take radical responsibility for your choices
- Live authentically according to your values
- Embrace freedom and its accompanying responsibility

**Buddhism**:
- Practice mindfulness and present-moment awareness
- Understand impermanence and non-attachment
- Cultivate compassion for yourself and others
- Find middle way between extremes

**4. Daily Practices for Meaningful Life**:
\`\`\`javascript
// Daily meaning-building routine
const dailyPractices = {
  morning: [
    'Meditation or mindfulness (10 min)',
    'Gratitude journaling (3 things)',
    'Set daily intention aligned with values',
    'Plan one meaningful activity'
  ],
  day: [
    'Practice presence in routine activities',
    'Connect meaningfully with someone',
    'Learn something new',
    'Help someone without expectation'
  ],
  evening: [
    'Reflect on meaningful moments',
    'Journal insights and lessons',
    'Plan tomorrow\'s meaningful activities',
    'Practice self-compassion'
  ]
};
\`\`\`

**5. Overcoming Existential Challenges**:
\`\`\`javascript
// Common life challenges and approaches
const lifeChallenges = {
  meaninglessness: [
    'Create small daily purposes',
    'Help others find meaning',
    'Engage in creative expression',
    'Study philosophy and wisdom traditions'
  ],
  freedomAnxiety: [
    'Start with small decisions',
    'Take responsibility for choices',
    'Build decision-making confidence',
    'Accept that perfect choices don\'t exist'
  ],
  isolation: [
    'Practice vulnerability in relationships',
    'Join communities with shared values',
    'Quality over quantity in connections',
    'Serve others to build connection'
  ],
  mortality: [
    'Use death as motivation to live fully',
    'Create legacy through positive impact',
    'Cherish present moments',
    'Build something that outlasts you'
  ]
};
\`\`\`

**6. Personal Growth Roadmap**:
\`\`\`javascript
// Life development stages
const growthJourney = {
  awareness: 'Understand yourself, patterns, values',
  acceptance: 'Embrace who you are, flaws and all',
  action: 'Take steps toward growth and change',
  integration: 'Combine insights into daily life',
  contribution: 'Help others with your wisdom',
  transcendence: 'Connect to something larger than self'
};
\`\`\`

**7. Wisdom from Various Traditions**:
\`\`\`javascript
// Universal wisdom principles
const universalWisdom = {
  eastern: [
    'The present moment is all we have',
    'Attachment causes suffering',
    'Compassion is the highest virtue',
    'Balance is key to harmony'
  ],
  western: [
    'Know thyself',
    'The unexamined life is not worth living',
    'Virtue is its own reward',
    'Excellence is a habit'
  ],
  indigenous: [
    'Live in harmony with nature',
    'Honor ancestors and future generations',
    'Community is essential to wellbeing',
    'Wisdom comes from experience'
  ]
};
\`\`\`

**8. Finding Your Unique Purpose**:
- **Interests**: What naturally draws your attention?
- **Talents**: What are you naturally good at?
- **Values**: What principles guide your decisions?
- **Impact**: How do you want to help others?
- **Joy**: What activities make you lose track of time?
- **Legacy**: What do you want to be remembered for?

**Questions for Self-Reflection**:
1. If money wasn't a factor, how would you spend your time?
2. What makes you feel most alive and engaged?
3. What problems in the world do you most want to solve?
4. What would you regret NOT doing?
5. How can you use your unique gifts to serve others?

What aspect of life philosophy or personal growth resonates with you? 🌱`;
  }

  // Coding specific responses with real solutions
  if (message.includes('react') || message.includes('reactjs') || message.includes('react.js')) {
    if (message.includes('hook') || message.includes('usestate') || message.includes('useeffect')) {
      return `🔧 **React Hooks Solution**:

Here's how to use React Hooks effectively:

\`\`\`jsx
import React, { useState, useEffect } from 'react';

function Component() {
  // State hook for managing data
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Effect hook for side effects
  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array = runs once

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
\`\`\`

**Key Points**:
- \`useState\` manages component state
- \`useEffect\` handles side effects and data fetching
- Always include dependency array in useEffect
- Handle loading and error states properly

**Common Mistakes to Avoid**:
- Don't call hooks inside loops or conditions
- Always use hooks at the top level of your component
- Don't forget the dependency array in useEffect

Need help with a specific React issue? Share your code! 💻`;
    }
    
    return `🚀 **React Development Guide**:

**Getting Started with React**:
\`\`\`bash
npx create-react-app my-app
cd my-app
npm start
\`\`\`

**Component Structure**:
\`\`\`jsx
import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello React!</h1>
    </div>
  );
}

export default App;
\`\`\`

**Essential Concepts**:
1. **Components**: Building blocks of React apps
2. **Props**: Pass data to components
3. **State**: Manage component data
4. **Hooks**: useState, useEffect, useContext
5. **Lifecycle**: Component mounting/updating/unmounting

**Best Practices**:
- Keep components small and focused
- Use functional components with hooks
- Implement proper error boundaries
- Optimize with React.memo when needed

What specific React topic do you need help with? 🤔`;
  }

  // JavaScript help with real code solutions
  if (message.includes('javascript') || message.includes('js') || message.includes('code')) {
    if (message.includes('array') || message.includes('map') || message.includes('filter')) {
      return `💻 **JavaScript Array Methods**:

**Essential Array Methods with Examples**:

\`\`\`javascript
// Data
const users = [
  { id: 1, name: 'John', age: 25, active: true },
  { id: 2, name: 'Jane', age: 30, active: false },
  { id: 3, name: 'Bob', age: 35, active: true }
];

// map() - Transform array
const names = users.map(user => user.name);
// Result: ['John', 'Jane', 'Bob']

// filter() - Select items
const activeUsers = users.filter(user => user.active);
// Result: [{ id: 1, name: 'John', age: 25, active: true }, { id: 3, name: 'Bob', age: 35, active: true }]

// reduce() - Aggregate values
const totalAge = users.reduce((sum, user) => sum + user.age, 0);
// Result: 90

// find() - Find first match
const userJane = users.find(user => user.name === 'Jane');
// Result: { id: 2, name: 'Jane', age: 30, active: false }

// Chaining methods
const activeUserNames = users
  .filter(user => user.active)
  .map(user => user.name);
// Result: ['John', 'Bob']
\`\`\`

**Performance Tips**:
- Use \`forEach()\` for side effects, \`map()\` for transformation
- \`filter()\` creates new array, \`find()\` stops at first match
- \`reduce()\` is powerful but can be complex - use clear variable names

**Common Patterns**:
\`\`\`javascript
// Remove duplicates
const unique = [...new Set(array)];

// Sort by property
const sorted = users.sort((a, b) => a.age - b.age);

// Check if all pass condition
const allActive = users.every(user => user.active);

// Check if any pass condition
const someActive = users.some(user => user.active);
\`\`\`

What specific JavaScript problem are you trying to solve? 🔧`;
    }

    return `🚀 **JavaScript Development**:

**Core Concepts**:
\`\`\`javascript
// Variables
let variable = 'can change';
const constant = 'cannot change';

// Functions
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Arrow functions
const add = (a, b) => a + b;

// Objects
const person = {
  name: 'John',
  age: 30,
  greet() {
    return \`Hi, I'm \${this.name}\`;
  }
};

// Arrays
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
\`\`\`

**ES6+ Features**:
- **Destructuring**: \`const {name, age} = person;\`
- **Spread/Rest**: \`const arr = [...oldArray];\`
- **Async/Await**: \`const data = await fetch(url);\`
- **Template Literals**: \`\`Hello \${name}\`\`

**DOM Manipulation**:
\`\`\`javascript
// Select elements
const element = document.getElementById('myId');
const elements = document.querySelectorAll('.myClass');

// Modify content
element.textContent = 'New text';
element.innerHTML = '<span>HTML content</span>';

// Add event listeners
element.addEventListener('click', () => {
  console.log('Clicked!');
});
\`\`\`

What specific JavaScript topic do you need help with? 💻`;
  }

  // Node.js backend help
  if (message.includes('node') || message.includes('nodejs') || message.includes('backend') || message.includes('server')) {
    return `🖥️ **Node.js Backend Development**:

**Express Server Setup**:
\`\`\`javascript
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
\`\`\`

**Database Integration (MongoDB)**:
\`\`\`javascript
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number
});

// Create Model
const User = mongoose.model('User', userSchema);

// CRUD Operations
const createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

const getAllUsers = async () => {
  return await User.find();
};

const updateUser = async (id, updateData) => {
  return await User.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};
\`\`\`

**API Best Practices**:
- Use async/await for async operations
- Implement proper error handling
- Validate input data
- Use appropriate HTTP status codes
- Implement authentication/authorization

What backend feature do you need help with? 🚀`;
  }

  // Default response for general questions
  return `🤖 **Hello! I'm your universal AI assistant!**

I'm here to help you with **any question or topic** you have in mind. Instead of listing everything I can do, I'd rather help you with what you actually need!

**Just ask me anything!** For example:
- "How do I start exercising?"
- "Help me create a budget"
- "What should I pack for Japan?"
- "How do I learn Spanish?"
- "Tips for job interviews"
- "Healthy dinner recipes"
- "How to manage stress"

**I can help with**: Health, finance, travel, learning, relationships, career, cooking, technology, life advice, programming, and much more!

What specific question or challenge would you like help with today? I'm ready to provide detailed solutions! 🌟`;
}

// @desc    Test chatbot API key
// @route   GET /api/chatbot/test
// @access  Public
router.get("/test", (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'sk-your-actual-openai-api-key-here') {
    return res.json({
      status: "error",
      message: "OpenAI API key not configured",
      configured: false,
      key_preview: apiKey ? `${apiKey.substring(0, 10)}...` : "not set"
    });
  }

  res.json({
    status: "success",
    message: "OpenAI API key is configured",
    configured: true,
    key_preview: `${apiKey.substring(0, 10)}...`
  });
});

// @desc    Get chatbot status
// @route   GET /api/chatbot/status
// @access  Public
router.get("/status", (req, res) => {
  res.json({
    status: "active",
    model: "gpt-3.5-turbo",
    features: [
      "Natural conversation",
      "Code assistance", 
      "Writing help",
      "Analysis",
      "Problem solving"
    ]
  });
});

module.exports = router;
