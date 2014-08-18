/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);

var mycondition = condition;  // these two variables are passed by the psiturk server process
var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to
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


function MoneyMachine(machine, responseFn){
    var makeOutcome = function(){
        var r = Math.random()
        var outcome;
        if(r < machine.probability){
            outcome = machine.payoff
        }else{
            outcome = 0
        }
        $('#machine' + machine.id.toString() + 'outcome').html('Most recent outcome: ' +
                                                               outcome.toString())
        responseFn(machine.id, outcome)
    }

    $('#machine' + machine.id.toString()).click(makeOutcome)
}

function PayoffCounter(startingNum){
    this.payoff = startingNum;
    this.credit = function(change){
        this.payoff += change;
        $('#bonus').html('current payoff: ' + this.payoff.toString());
    }
    this.getPayoff = function(){
        return this.payoff
    }
    this.credit(0);
}


function DecisionProblem(problem, completeFn){
    psiTurk.showPage('stage.html');
    var sampleCost = problem.sampleCost
    var samplePhase = true;
    var totalSamples = {machine1: 0, machine2: 0};

    var responseFn = function(button, outcome){
        // button code 0 indicates participant is ready to choose a machine
        if(button===0){

            samplePhase = false
        }else{
            if(samplePhase){
                totalSamples[button-1] += 1;
                bank.credit(sampleCost);
            }else{
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

            if(!samplePhase){
                setTimeout(function(){finish();}, 5000)
            }
        }

    }
    var finish = function(){
        completeFn();
    }

    var bank = new PayoffCounter(0);
    var machineOne = new MoneyMachine(problem.machine1, responseFn);
    var machineTwo = new MoneyMachine(problem.machine2, responseFn);
    $('#decision').click(function(){responseFn(0, 0)})

}

function ExperimentDriver(){
    allProblems = [{problemNum: 1,
                    sampleCost: -0.1,
                    machine1: {id: 1,
                               payoff: 3,
                               probability: .25},
                    machine2: {id: 2,
                               payoff: 4,
                               probability: 0.2}},
                   {problemNum: 2,
                    sampleCost: -0.1,
                    machine1: {id: 1,
                               payoff: 3,
                               probability: 1},
                    machine2: {id: 2,
                               payoff: 8,
                               probability: 1}}
                  ];
    var self = this;

    this.runNext = function(){
        var completeFn;
        if(allProblems.length==1){
            completeFn = function() {new Questionnaire();};
        }else{
            completeFn = function() {self.runNext();};
        }
        var problem = allProblems.shift();
        new DecisionProblem(problem, completeFn);
    }
    this.runNext()
}


var Questionnaire = function() {

	var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

	record_responses = function() {

		psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'submit'});

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});

	};

	prompt_resubmit = function() {
		replaceBody(error_message);
		$("#resubmit").click(resubmit);
	};

	resubmit = function() {
		replaceBody("<h1>Trying to resubmit...</h1>");
		reprompt = setTimeout(prompt_resubmit, 10000);

		psiTurk.saveData({
			success: function() {
			    clearInterval(reprompt);
                psiTurk.computeBonus('compute_bonus', function(){finish()});
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
            success: function(){
                psiTurk.computeBonus('compute_bonus', function() {
                	psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                });
            },
            error: prompt_resubmit});
	});


};

// Task object to keep track of the current phase
var currentview;

/*******************
 * Run Task
 ******************/
$(window).load( function(){
    psiTurk.doInstructions(
    	instructionPages, // a list of pages you want to display in sequence
    	function() { currentview = new ExperimentDriver(); }
    );
});
