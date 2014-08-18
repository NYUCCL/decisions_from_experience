import time
from numpy import *
from random import random
#from numba import jit, autojit

#@autojit
def create_value_table(pay_1, pay_2, sample_cost):
    # assume that after 30th sample you make a choice.
    # can make length longer, just takes longer to run but get
    # slightly better approximation of optimal.
    length = 40
    values = zeros((length, length, length, length))
    choices = zeros((length, length, length, length))
    # fill in choices at end, after last allowable sample.
    for a_1 in range(length):
        for b_1 in range(length - a_1):
            for a_2 in range(length - a_1 - b_1):
                for b_2 in range(length - a_1 - b_1 - a_2):
                    p_1 = (a_1+1.0)/(a_1+b_1+2.0)
                    p_2 = (a_2+1.0)/(a_2+b_2+2.0)
                    choose_1_val = p_1*pay_1
                    choose_2_val = p_2*pay_2
                    if choose_1_val > choose_2_val:
                        values[a_1, b_1, a_2, b_2] = choose_1_val
                        choices[a_1, b_1, a_2, b_2] = 2
                    else:
                        values[a_1, b_1, a_2, b_2] = choose_2_val
                        choices[a_1, b_1, a_2, b_2] = 3
    # fill in all the rest of the choices starting from the 2nd to last allowable
    # and moving backwards
    for l in range(length-1):
        #writing this way because numba doesn't like "reversed()"
        level = length - 1 - l
        for a_1 in range(level):
            for b_1 in range(level - a_1):
                for a_2 in range(level - a_1 - b_1):
                    for b_2 in range(level - a_1 - b_1 - a_2):
                        p_1 = (a_1+1.0)/(a_1+b_1+2.0)
                        p_2 = (a_2+1.0)/(a_2+b_2+2.0)
                        choose_1_val = p_1*pay_1
                        choose_2_val = p_2*pay_2
                        sample_1_val = -sample_cost + \
                                       p_1*values[a_1+1, b_1, a_2, b_2] + \
                                       (1-p_1)*values[a_1, b_1+1, a_2, b_2]
                        sample_2_val = -sample_cost + \
                                       p_2*values[a_1, b_1, a_2+1, b_2] + \
                                       (1-p_2)*values[a_1, b_1, a_2, b_2+1]
                        values[a_1, b_1, a_2, b_2] = max(sample_1_val, sample_2_val,
                                                         choose_1_val, choose_2_val)
                        choices[a_1, b_1, a_2, b_2] = argmax([sample_1_val, sample_2_val,
                                                              choose_1_val, choose_2_val])
    return values, choices

# simulate n_games number of games with two options to explore, with given
# payoffs and probabilities of payoff and given cost per sample
def simulator(pay_1, prob_1, pay_2, prob_2, sample_cost, n_games):
    # get DP value and action tables
    values, choices = create_value_table(pay_1, pay_2, sample_cost)
    # make lists to store simulation results
    decision_list = [0]*n_games
    payoff_list = [0]*n_games
    sample_list = [0]*n_games
    for n in range(n_games):
        # initialize info for current player
        choice = 0
        samples = 0
        payoff = 0
        a_1, b_1, a_2, b_2 = 0, 0, 0, 0
        # keep playing until agent decides on an option
        while(choice < 2):
            choice = choices[a_1, b_1, a_2, b_2]
            #for two sample options, update state and keep looping
            if choice==0:
                if random() < prob_1:
                    a_1 += 1
                else:
                    b_1 += 1
                samples += 1
                payoff -= sample_cost
            elif choice==1:
                if random() < prob_2:
                    a_2 += 1
                else:
                    b_2 += 1
                samples += 1
                payoff -= sample_cost
            # for two decision options, stop loop and record agent stats
            elif choice==2:
                if random() < prob_1:
                    payoff += pay_1
                payoff_list[n] = payoff
                decision_list[n] = 1
                sample_list[n] = samples
            elif choice==3:
                if random() < prob_2:
                    payoff += pay_2
                payoff_list[n] = payoff
                decision_list[n] = 2
                sample_list[n] = samples
    # return some summary stats over all players
    return mean(decision_list), mean(payoff_list), mean(sample_list), median(sample_list)



def main():
    #t0 = time.time()
    # comparing 90% chance of getting 10 points against a "sure thing" of getting 9,
    # with cost per sample of 0.01 points.
    # prints mean decision, mean payoff, mean # samples, and median # samples.
    print simulator(32*41, 0.1, 3*41, 0.9999, 0.03, 500)
    #print time.time()-t0

if __name__ =='__main__':
    main()
