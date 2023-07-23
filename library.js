'use strict';
const fs = require('fs');
const {
    Configuration,
    OpenAIApi
} = require("openai");
const prompt = require('./prompt.json')
const striptags = require('striptags')
const defaultBehaviors = ["Spam", "Profanity", "Racism", "Sexism", "Homophobia", "Aggressive Language"]
const defaultProperties = ["question", "answer", "passed", "feedback",
    ["code of conduct", "conduct", "code", "compliance"],
    ["context and relevance", "context", "relevance", "relevant"]
]
const excludeCids = [105]
const excludeMainPids = [98, 99]

const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const db = require.main.require('./src/database');
const utils = require.main.require('./src/utils');
const user = require.main.require('./src/user');
const events = require.main.require('./src/events');
const api = require.main.require('./src/api');
const socketAdmin = require.main.require('./src/socket.io/admin');
const pubsub = require.main.require('./src/pubsub');
const flags = require.main.require('./src/flags');
const posts = require.main.require('./src/posts');
const topics = require.main.require('./src/topics');
const notifications = require.main.require('./src/notifications');
const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};
let token, action, notify, configuration, openai, behaviors, checkForBehaviors, standardProperties, codeOfConduct, adminId, bypassOnReputation, userReputation, addContext = false,
    debug = false,
    reply = false;

plugin.init = async function(params) {
    routeHelpers.setupAdminPageRoute(params.router, '/admin/plugins/chatGPTmoderator', params.middleware, [], renderAdmin);
    let savedData = await getSavedData();
    behaviors = savedData.behaviors || defaultBehaviors
    codeOfConduct = savedData.codeOfConduct || []
    checkForBehaviors = `${behaviors.slice(0, -1).join(',')} and ${behaviors.slice(-1)}`
    standardProperties = []
    behaviors.forEach(behavior => {
        if (behavior.split(' ').length > 1) {
            let props = behavior.split(' ').map(x => x.toLowerCase())
            props.unshift(behavior.toLowerCase())
            standardProperties.push(props);
        } else {
            standardProperties.push(behavior.toLowerCase())
        }
    })
    standardProperties = defaultProperties.concat(standardProperties)
    const settings = await meta.settings.get('chatGPTmoderator');
    action = settings.delete == 'on' ? 'delete' : 'flag'
    notify = settings.notification == 'on' ? true : false
    addContext = settings.context == 'on' || settings.reply == 'on' ? true : false
    debug = settings.debug == 'on' ? true : false
    reply = settings.reply == 'on' ? true : false
    adminId = settings.uid ? settings.uid : false
    bypassOnReputation = settings.bypassOnReputation > 0 ? parseInt(settings.bypassOnReputation) : false
    if (settings.token) {
        token = settings.token
        configuration = new Configuration({
            apiKey: token
        });
        openai = new OpenAIApi(configuration);
    }
};

plugin.admin = {};

plugin.admin.menu = function(menu, callback) {
    menu.plugins.push({
        route: '/plugins/chatGPTmoderator',
        icon: 'fa-chart-bar',
        name: 'chatGPT Moderation',
    });

    setImmediate(callback, null, menu);
};
socketAdmin.plugins.chatGPTmoderator = {};

socketAdmin.plugins.chatGPTmoderator.save = async function(socket, data) {
    await db.set('nodebb-plugin-chatGPTmoderator', JSON.stringify(data));
};

plugin.updateSettings = async function(data) {
    if (data.plugin == 'chatGPTmoderator') {
        updatePlugin();
    }
}

plugin.moderatePost = async function(postData) {
    try {
        let uid = postData.post.uid
        let isAdminOrGlobalMod = await user.isAdminOrGlobalMod(uid)
        if (!token || !adminId || defaultBehaviors.length == 0 || uid == adminId || isAdminOrGlobalMod || excludeCids.indexOf(parseInt(postData.post.cid)) >= 0 || (excludeMainPids.indexOf(parseInt(postData.post.cid)) >= 0 && (postData.post.isMain ||  postData.post.topic && postData.post.topic.isMainPost) ) ) {
            return;
        } else if (bypassOnReputation) {
            userReputation = await user.getUserField(uid, 'reputation')
            if (userReputation && userReputation > bypassOnReputation) {
                userReputation = true;
                if (!reply) {
                    return;
                }
            }
        }
        let content = postData.post.content
        let pid = postData.post.pid
        let tid = postData.post.tid
        content = striptags(content.replace(/\n/g, '').replace(/<img .*?>/gi, '').replace(/<table .*?\/table>/gi, '').substr(0, 5000), [], '\n').replace(/\n\n+/g, '\n').replace(/\@/g, '').replace(/\!/g, '')
        if (debug) console.log(`Moderating post: ${postData.post.pid}`)
        let mainPid, pids = [],
            contextPosts = [],
            moderationContent = {};
        moderationContent.title = await topics.getTopicField(tid, 'title');
        moderationContent.content = content
        if (addContext) {
            if (!postData.post?.topic?.isMain) {
                mainPid = await topics.getTopicField(tid, 'mainPid')
                if (mainPid != pid) {
                    pids.push(mainPid)
                }
                if (postData.post.toPid) {
                    pids.push(postData.post.toPid)
                }
            }
            contextPosts = await posts.getPostsByPids(pids, adminId)
        }
        if (contextPosts.length > 0) {
            let mainPost = contextPosts.find(x => x.pid == mainPid)
            moderationContent.mainPost = striptags(mainPost.content.replace(/\n/g, '').replace(/<img .*?>/gi, '').replace(/<table .*?\/table>/gi, '').substr(0, 5000), [], '\n').replace(/\n\n+/g, '\n').replace(/\@/g, '').replace(/\!/g, '')
            if (contextPosts[1]) {
                let replyToPost = contextPosts.find(x => x.pid != mainPid)
                if (replyToPost) {
                    moderationContent.replyToPost = striptags(replyToPost.content.replace(/\n/g, '').replace(/<img .*?>/gi, '').replace(/<table .*?\/table>/gi, '').substr(0, 5000), [], '\n').replace(/\n\n+/g, '\n').replace(/\@/g, '').replace(/\!/g, '')
                }
            }
        }
        let moderation = await moderate(moderationContent)
        let normalized = normalizeModeration(moderation)
        if (debug) console.log('Moderation Results', moderation, normalized)
        await posts.setPostFields(pid, {
            moderation: normalized
        })
        if (!moderation.passed && !userReputation) {
            if (action == 'delete') {
                const data = await api.posts.delete({
                    uid: adminId
                }, {
                    pid: pid
                });
                let params = {
                    command: 'delete',
                    event: 'event:post_deleted',
                    type: 'post-delete',
                }
                await events.log({
                    type: 'moderated-delete',
                    uid: uid,
                    pid: pid,
                    tid: tid,
                    moderation: moderation
                });
            } else {
                const flag = await flags.create('post', pid, adminId, moderation.feedback, null, true);
                await events.log({
                    type: 'moderated-flag',
                    uid: uid,
                    pid: pid,
                    tid: tid,
                    moderation: moderation
                });
            }
            if (notify) {
                const title = await topics.getTopicField(tid, 'title');
                const footer = `if you feel your post has been ${action == 'delete' ? 'deleted' : 'flagged'} in error, please contact us`
                const activity = action == 'delete' ? ' Deleted Post in Topic' : 'Flagged Post in Topic'
                let notification = await notifications.create({
                    type: 'new-post-flag',
                    bodyShort: `${activity} (moderation): ${utils.decodeHTMLEntities(title)}`,
                    bodyLong: `<p>${moderation.feedback}</p>${footer}<p>Post contents:<p><i>"${content}..."</i></p></p>`,
                    nid: `tid:${tid}:pid:${pid}:uid:${uid}:user-${Date.now}`,
                    pid: pid,
                    tid: tid,
                    from: adminId,
                    path: `/post/${pid}`,
                    topicTitle: title ? `${activity}: ${utils.decodeHTMLEntities(title)}` : activity,
                    importance: 6,
                });
                await notifications.push(notification, [uid]);
            }
        } else {
            if (reply && moderation.question && moderation.answer) {
                const replyCaller = {
                    uid: adminId
                };
                const replyData = {
                    uid: adminId,
                    toPid: parseInt(pid),
                    tid: tid,
                    content: '<p><i>Bot Generated Response</i></p>' + moderation.answer
                };
                const created = await api.topics.reply(replyCaller, replyData);
            }
        }
    } catch (err) {
        console.log(err);
        winston.error(`[nodebb-plugin-chatGPmoderator] ${err?.message || err}`);
    }
    return postData
};

module.exports = plugin;

async function renderAdmin(req, res, next) {
    try {
        const users = await user.getAdminsandGlobalModsandModerators()
        const savedData = await getSavedData();
        behaviors = savedData.behaviors || defaultBehaviors
        codeOfConduct = savedData.codeOfConduct || []
        res.render('admin/plugins/chatGPTmoderator', {
            behaviors: behaviors,
            codeOfConduct: codeOfConduct,
            users: users
        });
    } catch (err) {
        winston.error(`[nodebb-plugin-chatGPmoderator] ${err?.message || err}`);
        next(err);
    }
}

async function getSavedData() {
    const data = await db.get('nodebb-plugin-chatGPTmoderator');
    return JSON.parse(data) || {}
}

async function updatePlugin() {
    const settings = await meta.settings.get('chatGPTmoderator');
    action = settings.delete == 'on' ? 'delete' : 'flag'
    notify = settings.notification == 'on' ? true : false
    addContext = settings.context == 'on' ? true : false
    debug = settings.debug == 'on' ? true : false
    reply = settings.reply == 'on' ? true : false
    adminId = settings.uid ? settings.uid : false
    bypassOnReputation = settings.bypassOnReputation > 0 ? parseInt(settings.bypassOnReputation) : false
    if (settings.token && settings.token !== token) {
        token = settings.token;
        configuration = new Configuration({
            apiKey: token
        });
        openai = new OpenAIApi(configuration);
    } else if (!settings.token) {
        token = settings.token;
    }
    let savedData = await getSavedData();
    behaviors = savedData.behaviors || defaultBehaviors
    codeOfConduct = savedData.codeOfConduct || ''
    checkForBehaviors = `${behaviors.slice(0, -1).join(',')} and ${behaviors.slice(-1)}`
    standardProperties = []
    behaviors.forEach(behavior => {
        if (behavior.split(' ').length > 1) {
            let props = behavior.split(' ').map(x => x.toLowerCase())
            props.unshift(behavior.toLowerCase())
            standardProperties.push(props);
        } else {
            standardProperties.push(behavior.toLowerCase())
        }
    })
    standardProperties = defaultProperties.concat(standardProperties)
};

async function moderate(moderationContent) {
    let moderation = {
        passed: true
    };
    let content = moderationContent.content
    let context = '';
    if (addContext) {
        if (moderationContent.mainPost) {
            context = `This post was commenting on a topic with the title ${moderationContent.title} and content:[ ${moderationContent.mainPost.substr(0,500)} ]`
        }
        if (moderationContent.replyToPost) {
            context = context + `and replying to the post with the content: [ ${moderationContent.replyToPost} ]`
        }
        context = context + '. Please ensure that the content to be moderated includes the context of the original topic and is relevant to the discussion.'
    }
    let customizedQuery = codeOfConduct ? `Please inspect the content of the post carefully for the following negative behavior patterns: ${checkForBehaviors}, as well as strict compiance with our code of conduct: ${codeOfConduct}. In your response please provide the results for all listed negative bahaviors and compliance with the code of conduct.` : `Please inspect the content of the post carefully for the following negative behavior patterns: ${checkForBehaviors}. In your response please provide the results for all listed negative behaviors.`
    const userContent = customizedQuery + `In addition, provide friendly feedback on the content directed at the user who created the content.${context} The content to be moderated is: ${content} and your response must be in RFC8259 compliant JSON with explicit properties for each behavior being evaluated, the mandatory feedback must be provided as a JSON property.`
    const messages = [{
            "role": "system",
            "content": prompt.system
        },
        {
            "role": "user",
            "content": userContent
        },
        {
            "role": "user",
            "content": `Your response must be in strict  RFC8259 compliant JSON and follow the following object structure:
							{
								"spam": Boolean,
								"profanity": Boolean,
								"racism": Boolean,
								"sexism": Boolean,
								"homophobia": Boolean,
								"aggressive_language": Boolean,
								"code_of_conduct": Boolean,
								"question": Boolean,
								"answer": "Answer to the question, if the post is a question",
								"feedback": "Friendly feedback related to the contents of the post"
							}
            `
        }
    ]
    if (reply) messages.push({
        "role": "user",
        "content": `Detect if the post is intended to be a question. If it is a question, you  must answer the question and include the boolean property "question" in RFC8259 compliant JSON. Include a propery "answer" RFC8259 compliant JSON with the answer ONLY if you answered the question`
    })
    const completion = await openai.createChatCompletion({
        //model: "gpt-3.5-turbo",
        model: "gpt-4",
        messages: messages,
        temperature: 0.4,
        max_tokens: 2000
    })
    let jsonString = completion.data.choices[0].message.content
    if (debug) {
        console.log(`API Usage:`, completion.data.usage);
    }
    try {
        let json;
        try {
            json = JSON.parse(jsonString)
        } catch (err) {
            const paramsPattern = /[^{}]+(?=})/g;
            let newString = jsonString.match(paramsPattern)
            if (newString.length > 1) {
                newString = newString.reduce((a, b) => a + '\n' + b)
            } else {
                newString = newString[0]
            }
            let misformedJSON = newString.split('\n').filter(x => x)
            misformedJSON = misformedJSON.map((x, i) => i < (misformedJSON.length - 1) && x.substr(-1) !== ',' ? x + ',' : x).join('')
            json = JSON.parse(`{${misformedJSON}}`)
            let feedback = jsonString.split('\n').find(x => x.toLowerCase().includes('feedback'))
            if (feedback && !Object.keys(json).find(x => x.toLowerCase().includes('feedback'))) {
                if (typeof(feedback) == 'object') {
                    let content = ''
                    Object.keys(feedback).map(x => {
                        if (!x.toLowerCase().includes('type') && (x.toLowerCase().includes('content') || x.toLowerCase().includes('message'))) {
                            content = content + ' ' + feedback[x]
                        }
                        json.feedback = content || feedback
                    })

                } else {
                    json.feedback = feedback.replace(/feedback: /i, '')
                }
            }
        }
        json = normalizeModeration(json);
        let positives = ['context_and_relevance', 'code_of_conduct']
        if (json) {
            Object.keys(json).map(x => {
                if (!x == 'feedback' && !x == 'question' && !x == 'answer') {
                    if (positives.indexOf(x) >= 0) {
                        if (!json[x]) moderation.passed = false;
                    } else {
                        if (json[x]) moderation.passed = false;
                    }
                } else if (x == 'feedback') {
                    moderation.feedback = json[x]
                    delete json[x]
                }
            })
        }
        moderation = {
            ...json,
            ...moderation
        }
        return moderation
    } catch (err) {
        console.log(jsonString);
        winston.error(`[nodebb-plugin-chatGPmoderator] ${err?.message || err}`);
        return moderation
    }
}

function normalizeModeration(moderation) {
    let results = {}
    let keys = Object.keys(moderation)
    keys.forEach(okey => {
        let key = okey.toLowerCase()
        standardProperties.forEach(token => {
            if (Array.isArray(token)) {
                token.forEach(subtoken => {
                    if (key.includes(subtoken)) {
                        results[token[0].replace(/ /g, '_')] = moderation[okey]
                    }
                })
            } else {
                if (key.includes(token)) {
                    results[token] = moderation[okey]
                }
            }
        })
    })
    results.timestamp = Date.now()
    return results
}
