<form role="form" class="chatGPTmoderator-settings">
			<div class="checkbox debug" title="Enable this if you want the moderation results output in the logs while testing changes to behaviors or the code of conduct">
				<label for="debug" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="debug" name="debug"/>
					<span class="mdl-switch__label">
						<strong>Debug</strong>
					</span>
				</label>
			</div>
	<div class="col-sm-12 col-xs-12 settings-header">
		<h4>chatGPT Moderation Plugin</h4>
	</div>
	<div class="row">
		<div class="col-sm-12 col-xs-12">
			<div class="form-group">
				<label for="token">openAI API Token</label>
				<input type="text" id="token" name="token" title="openAI API Key" class="form-control" placeholder="sk-2XN1y1uzzChYHGogJfPdT3BlbkTGFWXeB0htxzoRynfWhOql"/>
				<p class="help-block">
           Remove the key to disable moderation
          </p>
			</div>
		</div>
		<div class="form-group">
			<label for="cid">Moderator</label>
			<select id="uid" name="uid" class="form-control">
				<option value="">None</option>
				<!-- BEGIN users -->
				<option value="{users.uid}">{users.username}</option>
				<!-- END users -->
			</select>
			<p class="help-block">
              Designated user for moderation actions (setting to "None" will disable moderation)
            </p>
		</div>
			<div class="form-group">
				<label for="bypassOnReputation">
					Bypass moderation when user has reputation higher than this value
				</label>
        <input class="form-control" placeholder="0" type="number" id="bypassOnReputation" name="bypassOnReputation"></input>
					<p class="help-block">
           Leave empty or set to 0 to moderate all users, otherwise set the threshold for moderation
          </p>
			</div>
		<div class="form-group">
			<div class="checkbox">
				<label for="notification" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="notification" name="notification"/>
					<span class="mdl-switch__label">
						<strong>Enable Notifications for Moderation Actions</strong>
					</span>
					<p class="help-block">
           Enable this if you want notifications to be sent out when a post is flagged or deleted
          </p>
				</label>
			</div>
			<div class="checkbox">
				<label for="reply" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="reply" name="reply"/>
					<span class="mdl-switch__label">
						<strong>Auto generate replies if post contains a question</strong>
					</span>
					<p class="help-block">
           Enable this if you want a machine generated response to questions. Note: Context will also be enabled if this is enabled.
          </p>
				</label>
			</div>
			<div class="checkbox">
				<label for="delete" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="delete" name="delete"/>
					<span class="mdl-switch__label">
						<strong>Delete Moderated Posts</strong>
					</span>
					<p class="help-block">
           Enable this if you want moderated posts to be deleted rather than flagged
          </p>
				</label>
			</div>
			<div class="checkbox">
				<label for="context" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="context" name="context"/>
					<span class="mdl-switch__label">
						<strong>Add Topic Context</strong>
					</span>
					<p class="help-block">
           Enable this if you want to include contextual content from the main post as well as the post being replied to (if applicable)
          </p>
				</label>
			</div>
		</div>
	</div>
</form>
<div class="row">
	<div class="col-lg-12">
		<h4>Negative Behaviors</h4>
		<p class="help-block">Include any behavior patterns that you want to be monitored for moderation</p>
		<div class="table-responsive">
			<table class="behaviors table">
				<thead>
					<tr>
						<th>Behavior</th>
						<th></th>
					</tr>
				</thead>
				<tbody id="behaviors-parent">
					<!-- BEGIN behaviors -->
					<tr>
						<td class="col-md-3">
							<input class="behavior form-control" value="{behaviors}" />
						</td>
						<td class="col-md-1">
							<button class="behavior-remove btn btn-danger">Remove</button>
						</td>
					</tr>
					<!-- END behaviors -->
				</tbody>
			</table>
		</div>
		<div class="pull-right">
			<button id="add-behavior" class="btn btn-success">
				<i class="fa fa-plus"></i> Add Behavior
			</button>
		</div>
	</div>
	<div class=" tos-container col-lg-12">
		<h4 class="tos-label">Code of Conduct/Terms of Service</h4>
		<p class="help-block">
            Optional - Add your Code of Conduct or TOS to provide additional context for moderation of posts
          </p>
		<textarea id="tos" name="tos" title="Code of Conduct" placeholder="We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation....">{codeOfConduct}</textarea>
	</div>
</div>
<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>
<style>
.col-md-1 .behavior-remove {
float: right;
}
body.page-admin-chatgptmoderator .btn {
border-radius: 25px;
}
.tos-container .col-lg-12 {
margin-top: 20px;
}
#tos {
border-radius: 7px;
width: 100%;
max-width: 800px;
padding: 10px 20px;
outline-color: #2196f345;
min-height: 300px;
box-shadow: none;
margin-bottom: 50px;
}
#tos::placeholder {
  opacity: 0.5;
}
table.behaviors td input {
    color: #3c7bac;
    font-weight: 700;
    box-shadow: none;
}
body.page-admin-chatgptmoderator h4 {
margin-bottom: 0;
}
.settings-header h4 {
font-weight: 700;
margin-bottom: 20px;
line-height: 13.em;
}
@media (min-width: 768px) {
body.page-admin-chatgptmoderator #content {
padding-left: 50px
}
.settings-header h4 {
margin-left: -50px;
}
}
.debug.checkbox {
position: absolute;
top: 70px;
right: 50px;
}
</style>
