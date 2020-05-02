const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const moment = require("moment")
const { getUserId } = require("../utils")

const JWT_SECRET = process.env.JWT_SECRET

function createRecord(parent, args, context, info) {

  const date = moment(args.date)
  if(!date.isValid()){
    throw new Error("Invalid Date!")
  }

  const userId = getUserId(context)
  return context.db.mutation.createRecord({
    data: {
      user: {
        connect: { id: userId }
      },
      account:{
        connect: { id: args.accountId }
      },
      category:{
        connect: { id: args.categoryId }
      },
      amount: args.amount,
      type: args.type,
      date: args.date,
      description: args.description,
      tags: args.tags,
      note: args.note      
    }
  }, info)
}

function createAccount(parent, { description }, context, info) {
  const userId = getUserId(context)
  return context.db.mutation.createAccount({
    data: {
      description,
      user: {
        connect: {
          id: userId
        }
      }
    }
  }, info)
}

function createCategory(parent, { description, operation }, context, info) {
  const userId = getUserId(context)
  return context.db.mutation.createCategory({
    data: {
      description,
      operation,
      user: {
        connect: {
          id: userId
        }
      }
    }
  }, info)
}

async function login(parent, { email, password }, context, info) {

  const user = await context.db.query.user({ where: { email } })
  const errorText = "Credenciais Inválidas"

  if (!user) {
    throw new Error(errorText)
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    throw new Error(errorText)
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "2h" })

  return {
    token,
    user
  }

}

async function signup(parent, args, context, info) {

  const password = await bcrypt.hash(args.password, 10)
  const user = context.db.mutation.createUser({ data: { ...args, password } })

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "2h" })

  return {
    token,
    user
  }
}

module.exports = {
  login,
  signup,
  createAccount,
  createCategory,
  createRecord
}