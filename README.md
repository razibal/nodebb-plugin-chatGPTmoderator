# Installation

Installation is pretty straightforward

Clone this repo and install from the nodeBB root folder 

```bash
npm install [/path/to/nodebb-plugin-chatGPTmoderator]
```
![screenshot-2023 05 14-10_12_45](https://community.nodebb.org/assets/uploads/files/1684091602148-screenshot-2023.05.14-10_12_45.png)
# Setup



## Settings

- **openAPI token** - API key
- **Moderator** - User  id for moderation activities
- **Bypass moderation when user has reputation higher than this value** - Leave empty or set to 0 if you want all users to be moderated, otherwise set to the threshold below which moderation will be triggered.
- **Enable Notifications for Moderation Actions** - Enable/Disable notifications for moderation actions
- **Delete Moderated Posts** - Enable this if you want moderated posts to be deleted rather than flagged
- **Add Topic Context** - Enable this if you want to include contextual content from the main post as well as the post being replied to (if applicable)
- **Negative Behaviors** - This is the list of behaviors that should be considered when moderating a post. The defaults are "Spam", "Profanity", "Racism", "Sexism", "Homophobia", "Aggressive Language”
- **Code of Conduct/Terms of Service** - (Optional)  Add your Code of Conduct or Terms of Service to provide additional context for moderation of posts

### Some examples of moderation results and feedback

### Post 1

> The Albanians are an ethnic group native to the Balkan Peninsula who share a common Albanian ancestry, culture, history and language. They primarily live in Albania, Kosovo, North Macedonia, Montenegro, Serbia as well as in Croatia, Greece, Italy and Turkey. They also constitute a large diaspora with several communities established across Europe, the Americas and Oceania.
> 
> 
> Albanians have Paleo-Balkanic origins. Exclusively attributing these origins to the Illyrians, Thracians or other Paleo-Balkan people is still a matter of debate among historians and ethnologists.
> 

#### Results - passed
**Feedback**
*Thank you for your informative post on the Albanians. It's great that you've provided information on their ancestry, clulture and history. Your post is compliant with our code of conduct, and there is no evidence of negative behavior patterns. Keep up the good work!*

```json
{       "spam": false,
        "profanity": false,
        "racism": false,
        "sexism": false,
        "homophobia": false,
        "aggressive_language": false,
        "compliance": true,
        "passed": true,
        "feedback": "Thank you for your informative post on the Albanians. It's great that you've provided information on their ancestry, clulture and history. Your post is compliant with our code of conduct, and there is no evidence of negative behavior patterns. Keep up the good work!"
    }
```

### Post 2

**Added a negative (homophobic) term to the same post**

#### Results : failed
**Feedback**
*Hello, please note that the use of derogatory language directed towards individuals based on their sexual orientation is not allowed in our community. Please refrain from using such language in future posts. Additionally, please ensure that posts comply with our code of conduct that pledges to make participation in our community a harassment-free experience for everyone regardless of any personal characteristic. Thank you for your understanding and cooperation in maintaining a healthy and inclusive community.*

```json
{
        "spam": false,
        "profanity": true,
        "racism": false,
        "sexism": true,
        "homophobia": true,
        "aggressive_language": false,
        "compliance": false,
        "passed": false,
        "feedback": "Hello, please note that the use of derogatory language directed towards individuals based on their sexual orientation is not allowed in our community. Please refrain from using such language in future posts. Additionally, please ensure that posts comply with our code of conduct that pledges to make participation in our community a harassment-free experience for everyone regardless of any personal characteristic. Thank you for your understanding and cooperation in maintaining a healthy and inclusive community."
    }
```
### Post 3
**Replied to original post with minimum verbiage**

> Looks good!
> 

#### Results: passed
**Feedback**
*Thank you for your contribution! Please note that in order to maintain a high quality of discussion, we require substantive content that is meaningfully related to the subject under discussion. Please provide more information or context in your future posts. Also, please remember to be respectful and considerate of other community members' opinions and experiences. Thank you!*

```json
{
        "spam": false,
        "profanity": false,
        "racism": false,
        "sexism": false,
        "homophobia": false,
        "aggressive_language": false,
        "compliance_with_code_of_conduct": true,
        "passed": true,
        "friendly_feedback": "Thank you for your contribution! Please note that in order to maintain a high quality of discussion, we require substantive content that is meaningfully related to the subject under discussion. Please provide more information or context in your future posts. Also, please remember to be respectful and considerate of other community members' opinions and experiences. Thank you!"
    }
```

### Post 4
**Replied with hostility**

> This is full of c**p, you have no idea what you’re talking about!
> 

#### Results: failed
**Feedback**
*Your post contains aggressive language and profanity which is not acceptable on our community platform. We request you to refrain from such language and keep the conversation respectful and courteous. Additionally, it’s important to adhere to our code of conduct which states that “participation in our community must be a harassment-free experience for everyone”. We urge you to respect all members of our community and aim towards creating a diverse, inclusive and healthy environment for all.*

```json
{
        "Spam": false,
        "Profanity": true,
        "Racism": false,
        "Sexism": false,
        "Homophobia": false,
        "Aggressive Language": true,
        "Code of Conduct": false,
        "Passed": false,
        "feedback": "Your post contains aggressive language and profanity which is not acceptable on our community platform. We request you to refrain from such language and keep the conversation respectful and courteous. Additionally, it’s important to adhere to our code of conduct which states that “participation in our community must be a harassment-free experience for everyone”. We urge you to respect all members of our community and aim towards creating a diverse, inclusive and healthy environment for all."
    }
```

### Post 5
**Replied with comments on a different ethnic group (with Topic Context enabled)**
Note: Context and Relevance are tricky and might need to be fine tuned.

> Italians are an ethnic group native to the Italian geographical region and its neighboring insular territories. Italians share a common culture, history, ancestry and language. Their predecessors differ regionally, but generally include native populations such as the Etruscans, and the Italic peoples, including the Latins, from which the Romans emerged and helped create and evolve the modern Italian identity.
> 

#### Results: failed
**Feedback**
*Thank you for sharing information on the ethnic group Italians and their history. However, please ensure that your posts are directly related to the topic of discussion. In this case, while the topic is about Albanians, your post does not seem to contribute to the conversation. Please try to stay on topic in future postings.*

```json
{ 
  "spam": false,
  "profanity": false,
  "racism": false,
  "sexism": false,
  "homophobia": false,
  "aggressive_language": false,
  "code_of_conduct": false,
  "context_and_relevance": false,
  "passed": false,
  "feedback": "Thank you for sharing information on the ethnic group Italians and their history. However, please ensure that your posts are directly related to the topic of discussion. In this case, while the topic is about Albanians, your post does not seem to contribute to the conversation. Please try to stay on topic in future postings."
}
```

