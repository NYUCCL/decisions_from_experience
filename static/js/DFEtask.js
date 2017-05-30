/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

/*jslint browser: true*/
/*global $, window, setTimeout, clearInterval, PsiTurk, uniqueId, adServerLoc, mode, condition, counterbalance */

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode),
    EXP = {
        "condition": condition,
        "counterbalance": counterbalance,
        "pages": [
            "instructions/instruct-ready.html",
            "stage.html",
            "postquestionnaire.html"
        ]
    };


psiTurk.preloadPages(EXP.pages);

var instructionPages = [ // add as a list as many pages as you like
    "instructions/instruct-ready.html"
];


function bandit(specs, responseFn) {
    "use strict";
    var makeOutcome = function () {
        var r = Math.random(),
            outcome;
        if (r < specs.probability) {
            outcome = specs.payoff;
        } else {
            outcome = 0;
        }
        $("#machine" + specs.banditId.toString() + "outcome").html("Most recent outcome: " +
                                                               outcome.toString());
        responseFn(specs.banditId, outcome);
    };
    $("#machine" + specs.banditId.toString()).click(makeOutcome);
}

function payoffCounter(startingNum) {
    "use strict";
    var payoff = startingNum,
        that = {};
    that.credit = function (change) {
        payoff += change;
        $("#bonus").html("current payoff: " + payoff.toString());
    };
    that.getPayoff = function () {
        return payoff;
    };
    that.credit(0);
    return that;
}


function decisionProblem(problem, completeFn) {
    "use strict";
    psiTurk.showPage("stage.html");
    var sampleCost = problem.sampleCost,
        samplePhase = true,
        totalSamples = {bandit1: 0, bandit2: 0},
        bank = payoffCounter(0);

    function finish() {
        completeFn();
    }

    function responseFn(button, outcome) {
        // button code 0 indicates participant is ready to choose a bandit
        if (button === 0) {
            samplePhase = false;
        } else {
            if (samplePhase) {
                totalSamples[button - 1] += 1;
                bank.credit(sampleCost);
            } else {
                bank.credit(outcome);
            }
            psiTurk.recordTrialData({"sample": samplePhase,
                                     "banditId": button,
                                     "outcome": outcome,
                                     "bankAfter": bank.getPayoff(),
                                     "sampleCost": sampleCost,
                                     "totalSamples": totalSamples.bandit1 + totalSamples.bandit2,
                                     "samples1": totalSamples.bandit1,
                                     "samples2": totalSamples.bandit2
                                    });

            if (!samplePhase) {
                setTimeout(function () { finish(); }, 5000);
            }
        }

    }

    bandit(problem.bandit1, responseFn);
    bandit(problem.bandit2, responseFn);

    $("#decision").click(function () {responseFn(0, 0); });

}

function questionnaire() {
    "use strict";
    var errorMessage = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>",
        replaceBody, promptResubmit, resubmit, recordResponses;

    replaceBody = function(x) { $("body").html(x); };
    recordResponses = function () {
        psiTurk.recordTrialData({"phase": "postquestionnaire", "status": "submit"});

        $("textarea").each(function () {
            psiTurk.recordUnstructuredData(this.id, this.value);
        });
        $("select").each(function () {
            psiTurk.recordUnstructuredData(this.id, this.value);
        });
    };

    promptResubmit = function () {
        replaceBody(errorMessage);
        $("#resubmit").click(resubmit);
    };

    resubmit = function () {
        var reprompt;
        replaceBody("<h1>Trying to resubmit...</h1>");
        reprompt = setTimeout(promptResubmit, 10000);

        psiTurk.saveData({
            success: function() {
                clearInterval(reprompt);
                // psiTurk.computeBonus("compute_bonus", function () {
                //     psiTurk.completeHIT();
                // });
                psiTurk.completeHIT();
            },
            error: promptResubmit
        });
    };

    // Load the questionnaire snippet
    psiTurk.showPage("postquestionnaire.html");
    psiTurk.recordTrialData({"phase": "postquestionnaire", "status": "begin"});

    $("#next").click(function () {
        recordResponses();
        psiTurk.saveData({
            success: function () {
                // psiTurk.computeBonus("compute_bonus", function () {
                psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                // });
            },
            error: promptResubmit});
    });

}

function experimentDriver() {
    "use strict";
    var allProblems, runNext;

    runNext = function () {
        var completeFn,
            problem = allProblems.shift();
        if (allProblems.length === 0) {
            completeFn = function () {questionnaire(); };
        } else {
            completeFn = function () {runNext(); };
        }
        decisionProblem(problem, completeFn);
    };

    $.ajax({
        dataType: "json",
        url: "/get_stims",
        data: {condition: condition,
               counterbalance: counterbalance
              },
        success: function (data) {
            allProblems = data.results;
            runNext();
        }
    });

}


/*******************
 * Run Task
 ******************/
$(window).load(function () {
    "use strict";
    psiTurk.doInstructions(
        instructionPages, // a list of pages you want to display in sequence
        function () { experimentDriver(); }
    );
});
