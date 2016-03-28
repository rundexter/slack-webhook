var req  = require('superagent')
  , _    = require('lodash')
  , q    = require('q')
;

function firstOrIndex(coll, idx) {
    return coll[idx] || coll[0];
}

module.exports = {
    /**
     * run
     *
     * @param {WFDataStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {WFDataParser} dexter Container for all data used in this workflow.
     */
    run: function(step/*, dexter*/) {
        var channels    = step.input('channel')
          , attachments = step.input('attachments')
          , texts       = step.input('text')
          , usernames   = step.input('username')
          , urls        = step.input('webhook_url')
          , icon_emojis = step.input('icon_emoji')
          , connections = []
          , self        = this
          , data
        ;

        //use the channels array to dictate how many messages get sent out
        channels.each(function(channel, idx) {
            //grabe the base post data
            data = _.clone({
                icon_emoji : firstOrIndex(icon_emojis, idx),
                channel    : channel,
                text       : firstOrIndex(texts, idx),
                username   : firstOrIndex(usernames, idx),
            });

            if(data.text === undefined) return self.fail("Text is required.");

            //special case for when the text is "0"
            //slack won't accept it without a leading space
            if(data.text === 0 || data.text === "0") data.text = " 0";

            //if there are attachments handle them
            if(attachments.length) {
                data.attachments  = attachments[idx] !== undefined ? attachments[idx] : attachments[0];
                data.unfurl_links = false;

                /* the attachments "array" actually needs to be a JSON encoded string. Weird. */
                data.attachments = JSON.stringify( data.attachments );
            } else {
                data.unfurl_links = true;
            }

            console.log(data);

            connections.push(self.send(data, firstOrIndex(urls, idx)));
        });
        
        q.all(connections)
          .then(this.complete.bind(this))
          .fail(this.fail.bind(this))
        ;
   }
   , send: function(data, url) {
        var deferred = q.defer();

        req.post(url)
          .type('form')
          .send({payload: JSON.stringify(data) })
          .end(function(err, result) {
                return err || result.statusCode >= 400
                  ? deferred.reject({
                    error: err || result.text,
                    body: result.body
                  })
                  : deferred.resolve({ response: result.text })
               ;

          });

        return deferred.promise;
   }
};
