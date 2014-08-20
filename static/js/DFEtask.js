/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

/*jslint browser: true*/
/*global $, jQuery, alert, PsiTurk, uniqueId, adServerLoc, mode, condition, counterbalance */

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode),
    mycondition = condition,
    mycounterbalance = counterbalance,
    currentview;
// they are not used in the stroop code but may be useful to you

// All pages to be loaded
var pages = [
    "instructions/instruct-ready.html",
    "stage.html",
    "postquestionnaire.html"
];


psiTurk.preloadPages(pages);

var instructionPages = [ // add as a list as many pages as you like
    "instructions/instruct-ready.html"
];


function MoneyMachine(machine, responseFn) {
    "use strict";
    var makeOutcome = function () {
        var r = Math.random(),
            outcome;
        if (r < machine.probability) {
            outcome = machine.payoff;
        } else {
            outcome = 0;
        }
        $('#machine' + machine.machineId.toString() + 'outcome').html('Most recent outcome: ' +
                                                               outcome.toString());
        responseFn(machine.machineId, outcome);
    };
    $('#machine' + machine.machineId.toString()).click(makeOutcome);
}

function PayoffCounter(startingNum) {
    "use strict";
    this.payoff = startingNum;
    this.credit = function (change) {
        this.payoff += change;
        $('#bonus').html('current payoff: ' + this.payoff.toString());
    };
    this.getPayoff = function () {
        return this.payoff;
    };
    this.credit(0);
}


function DecisionProblem(problem, completeFn) {
    "use strict";
    psiTurk.showPage('stage.html');
    var sampleCost = problem.sampleCost,
        samplePhase = true,
        totalSamples = {machine1: 0, machine2: 0},
        bank = new PayoffCounter(0);

    function responseFn(button, outcome) {
        // button code 0 indicates participant is ready to choose a machine
        if (button === 0) {
            samplePhase = false;
        } else {
            if (samplePhase) {
                totalSamples[button - 1] += 1;
                bank.credit(sampleCost);
            } else {
                bank.credit(outcome);
            }
            psiTurk.recordTrialData({'sample': samplePhase,
                                     'machine': button,
                                     'outcome': outcome,
                                     'bankAfter': bank.getPayoff(),
                                     'sampleCost': sampleCost,
                                     'totalSamples': totalSamples.machine1 + totalSamples.machine2,
                                     'samples1': totalSamples.machine1,
                                     'samples2': totalSamples.machine2
                                    });

            if (!samplePhase) {
                setTimeout(function () { finish(); }, 5000);
            }
        }

    }

    new MoneyMachine(problem.machine1, responseFn);
    new MoneyMachine(problem.machine2, responseFn);

    function finish() {
        completeFn();
    }

    $('#decision').click(function () {responseFn(0, 0); });

}

function ExperimentDriver() {
    "use strict";
    var self = this,
        allProblems;

    this.runNext = function () {
        var completeFn,
            problem = allProblems.shift();
        if (allProblems.length === 0) {
            completeFn = function () {currentview = new Questionnaire(); };
        } else {
            completeFn = function () {self.runNext(); };
        }
        currentview = new DecisionProblem(problem, completeFn);
    };

    $.ajax({
        dataType: "json",
        url: "/get_stims",
        data: {condition: condition,
               counterbalance: counterbalance
               },
        success: function (data) {
            allProblems = data.results;
            self.runNext();
        }
    });

}


function Questionnaire() {

    var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

    var record_responses = function () {
        psiTurk.recordTrialData({'phase': 'postquestionnaire', 'status': 'submit'});

        $('textarea').each( function(i, val) {
            psiTurk.recordUnstructuredData(this.id, this.value);
        });
        $('select').each( function(i, val) {
            psiTurk.recordUnstructuredData(this.id, this.value);
        });
    };

    var prompt_resubmit = function() {
        replaceBody(error_message);
        $("#resubmit").click(resubmit);
    };

    resubmit = function() {
        replaceBody("<h1>Trying to resubmit...</h1>");
        reprompt = setTimeout(prompt_resubmit, 10000);

        psiTurk.saveData({
            success: function() {
                clearInterval(reprompt);
                psiTurk.computeBonus('compute_bonus', function () {finish(); });
            },
            error: prompt_resubmit
        });
    };

    // Load the questionnaire snippet
    psiTurk.showPage('postquestionnaire.html');
    psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});

    $("#next").click(function () {
        record_responses();
        psiTurk.saveData({
            success: function () {
                psiTurk.computeBonus('compute_bonus', function () {
                    psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                });
            },
            error: prompt_resubmit});
    });

};

/*******************
 * Run Task
 ******************/
$(window).load(function () {
    psiTurk.doInstructions(
        instructionPages, // a list of pages you want to display in sequence
    	function () { currentview = new ExperimentDriver(); }
    );
});
