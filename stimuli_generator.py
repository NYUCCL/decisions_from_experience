def problems_generator(condition, counterbalance):
    exp_definition = [{'problemNum': 1,
                       'sampleCost': -0.1,
                       'machine1': {'machineId': 1,
                                  'payoff': 3,
                                  'probability': 0.25},
                       'machine2': {'machineId': 2,
                                  'payoff': 4,
                                  'probability': 0.2}},
                      {'problemNum': 2,
                       'sampleCost': -0.1,
                       'machine1': {'machineId': 1,
                                  'payoff': 3,
                                  'probability': 1},
                       'machine2': {'machineId': 2,
                                  'payoff': 8,
                                  'probability': 1}}
                      ]
    return exp_definition
