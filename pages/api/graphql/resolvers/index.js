import user from './user'

export default {
    Query: {
        hello(parent, args, context, info) {
            return "hello world"
        }
    },
    Mutation: {
        ...user.Mutation
    }
}