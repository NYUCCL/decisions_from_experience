def problems_generator(condition, counterbalance):
    exp_definition = [{'problemNum': 1,
                       'sampleCost': -0.1,
                       'bandit1': {'banditId': 1,
                                  'payoff': 3,
                                  'probability': 0.25},
                       'bandit2': {'banditId': 2,
                                  'payoff': 4,
                                  'probability': 0.2}},
                      {'problemNum': 2,
                       'sampleCost': -0.1,
                       'bandit1': {'banditId': 1,
                                  'payoff': 3,
                                  'probability': 1},
                       'bandit2': {'banditId': 2,
                                  'payoff': 8,
                                  'probability': 1}}
                      ]
    return exp_definition
