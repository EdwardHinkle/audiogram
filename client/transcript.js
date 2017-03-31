var jQuery = require("jquery"),
    ReactDOM = require('react-dom'),
    React = require('react'),
    TranscriptEditor = require('transcript-editor').default,
    { Transcript } = require('transcript-model'),
    currentTranscript;



// Attach listener to hightlight words during playback
jQuery("audio").on("timeupdate", function(){
  jQuery(".transcript-editor-block__word").removeClass("played");
  if (!this.paused) {
    var currentTime = this.currentTime;
    jQuery(".transcript-editor-block__word").filter(function() {
      var wordStart = +jQuery(this).attr("data-start") + 0.1;
      return wordStart < currentTime;
    }).addClass("played");
  }
});

// Move playhead when clicking on a word
jQuery(document).on('click', '.transcript-editor-block__word', function(){
  var time = jQuery(this).attr("data-start");
  jQuery("audio").get(0).currentTime = time;
  console.log("transcript click: " + time);
});

// Make clip selection when highlighting transcript segments
var selectionStart;
jQuery(document).on('mousedown', '.public-DraftStyleDefault-block', function(){
                // Start selection on block whitespace
                if (!selectionStart){
                  selectionStart = jQuery(this).parents("[data-block]").next().find(".transcript-editor-block__word:first");
                  console.log("mousedown block");
                }
              }).on('mousedown', '.transcript-editor-block__space', function(){
                // Start selection on space between words
                if (!selectionStart){
                  selectionStart = jQuery(this).prev();
                  console.log("mousedown space");
                }
              }).on('mousedown', '.transcript-editor-block__word', function(){
                // Start selection on a word
                selectionStart = jQuery(this);
                console.log("mousedown word");
              }).on('mouseup', 'body *', function(){
                if (selectionStart) {
                  var selectionEnd = null;
                  if (jQuery(this).is(".transcript-editor-block__word *")) {
                    // Finish selection on a word
                    console.log("mouseup word");
                    selectionEnd = jQuery(this).parents(".transcript-editor-block__word");
                  } else if (jQuery(this).is(".transcript-editor-block__space *")){
                    // Finish selection on a space
                    console.log("mouseup space");
                    selectionEnd = jQuery(this).parents(".transcript-editor-block__space").prev();
                  } else if (jQuery(this).is(".public-DraftStyleDefault-block")) {
                    // Finish selection on block whitespace
                    selectionEnd = jQuery(this).find(".transcript-editor-block__word:last");
                  }
                  if (selectionEnd && selectionStart.get(0)!==selectionEnd.get(0)) {
                    // If start/end points aren't the same
                    var minimap = require('./minimap.js'),
                        audio = require('./audio.js'),
                        duration = Math.round(100*audio.duration())/100,
                        start = +jQuery(selectionStart).attr("data-start"),
                        end = +jQuery(selectionEnd).attr("data-end");
                    console.log("transcript select: " + start + " - " + end);
                    if (start>end) [start, end] = [end, start];
                    if (!jQuery(this).is(".public-DraftStyleDefault-block") || end-start>1) {
                      start = (start)/duration;
                      end = (end)/duration;
                      minimap.drawBrush({start: start, end: end});
                      if (window.getSelection) {
                        window.getSelection().removeAllRanges();
                      } else if (document.selection) {
                        document.selection.empty();
                      }
                    }
                  }
                }
                selectionStart = null;
              });


// Highlight selected words 
function highlight(start, end) {
  jQuery(".transcript-editor-block__word").removeClass("unused");
  if (start>=0 && end) {
    jQuery(".transcript-editor-block__word").filter(function() {
      var wordStart = jQuery(this).attr("data-start"),
          wordEnd = jQuery(this).attr("data-end"),
          wordMiddle = wordEnd - (wordEnd-wordStart)/2;
      return wordMiddle < start || wordStart > end;
    }).addClass("unused");
  }
}

function toJSON() {
  return currentTranscript ? currentTranscript.toJSON() : null;
}

function load(json) {

  if (json.hasOwnProperty("commaSegments")) {
    currentTranscript = Transcript.fromComma(json);
  } else if (json.hasOwnProperty("kaldi")) {
    currentTranscript = Transcript.fromKaldi(json.transcript, json.segments);
  }

  var props = {
    transcript: currentTranscript,
    showSpeakers: false,
    onTranscriptUpdate: function(data){
      currentTranscript = data;
      var preview = require("./preview.js");
      preview.redraw();
      console.log(toJSON());
    }
  };
  var TS = React.createClass({
    render: function() {
      return React.createElement(TranscriptEditor, props);
    }
  });
  var transcriptElement = document.querySelector("transcript");
  ReactDOM.render(React.createElement(TS), transcriptElement);

}

function poll(job) {

  setTimeout(function(){
    jQuery.getJSON( "/kaldi/" + job, function( data ) {
      if (data.status=="SUCCESS") {
        console.log(data);
        if (!data.error) {
          var transcript = JSON.parse(data.transcript),
              segments = JSON.parse(data.segments);
          load({transcript: transcript, segments: segments, kaldi: transcript.metadata.version});
        }
        console.log("TRANSCRIPTION FINISHED: " + window.performance.now());
        jQuery("#transcript").removeClass("loading");
      } else {
        console.log("not yet");
        poll(job);
      }
    });
  }, 5000);

}

function generate(blob) {

  console.log("TRANSCRIPTION START: " + window.performance.now());

  var formData = new FormData();
  formData.append("audio",blob);

  jQuery.ajax({
    url: "/kaldi/",
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    type: 'POST',
    success: function(data){
      console.log(data);
      poll(data.job);
    }
  });

}

module.exports = {
  generate: generate,
  load: load,
  toJSON: toJSON,
  highlight: highlight
}
