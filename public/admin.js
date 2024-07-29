/* globals app, $, socket, define */

'use strict';

define('admin/plugins/chatGPTmoderator', ['settings'], function(settings) {
    var ChatGPTModerator = {};

    ChatGPTModerator.init = function() {
        $('#add-behavior').on('click', function() {
            console.log('adding behavior')
            app.parseAndTranslate('admin/plugins/chatGPTmoderator', 'behaviors', {
                behaviors: ['Bad Behavior']
            }, function(html) {
                $('#behaviors-parent').append(html);
            });
        });

        settings.load('chatGPTmoderator', $('.chatGPTmoderator-settings'));
        $('#save').on('click', function() {
            var data = {
                behaviors: [],
                codeOfConduct: ''
            };
            $('#behaviors-parent tr').each(function() {
                data.behaviors.push(
                    $(this).find('.behavior').val()
                );
            });
            data.codeOfConduct = $('#tos').val();

            Promise.all([
                new Promise((resolve, reject) => {
                    socket.emit('admin.plugins.chatGPTmoderator.save', data, err => (!err ? resolve() : reject(err)));
                }),
                new Promise((resolve, reject) => {
                    settings.save('chatGPTmoderator', $('.chatGPTmoderator-settings'), err => (!err ? resolve() : reject(err)));
                }),
            ]).then(() => {
                app.alert({
                    type: 'success',
                    alert_id: 'chatGPTmoderator-saved',
                    title: 'Settings Saved',
                });
            }).catch(app.alertError);
        });

        $('#behaviors-parent').on('click', '.behavior-remove', function() {
            $(this).parent().parent().remove();
        });
    };
    $("#tos").height($("#tos")[0].scrollHeight)
    $('#tos').on('input', function() {
        this.style.height = 'auto';

        this.style.height =
            (this.scrollHeight) + 'px';
    });
    return ChatGPTModerator;
});
