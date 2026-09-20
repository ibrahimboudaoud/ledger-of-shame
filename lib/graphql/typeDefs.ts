export const typeDefs = /* GraphQL */ `
  type Group {
    id: ID!
    name: String!
    createdAt: String!
    people: [Person!]!
    debts: [Debt!]!
    settlements: [Settlement!]!
  }

  type Person {
    id: ID!
    name: String!
    groupId: ID!
  }

  type Debt {
    id: ID!
    groupId: ID!
    fromId: ID!
    toId: ID!
    amountCents: Int!
    description: String
    createdAt: String!
  }

  type Settlement {
    from: ID!
    to: ID!
    amountCents: Int!
  }

  type Query {
    group(id: ID!): Group
  }

  type Mutation {
    addExpense(
      groupId: ID!
      payerId: ID!
      amountCents: Int!
      participantIds: [ID!]!
      description: String
    ): [Debt!]!
    settleDebt(groupId: ID!, fromId: ID!, toId: ID!, amountCents: Int!): Debt!
  }
`;
