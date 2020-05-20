const moment = require("moment")
const { getUserId } = require("../utils")

function totalBalance(parent, { date }, context, info) {
  const userId = getUserId(context)

  const env = process.env
  const dateISO = moment(date, "YYYY-MM-DD").endOf("day").toISOString()
  const pgSchema = `${env.PRISMA_SERVICE}$${env.PRISMA_STAGE}`

  const mutation = `
    mutation TotalBalance($database: PrismaDatabase, $query:String!) {
      executeRaw(database: $database, query: $query)
    }
  `
  const variaveis = {
    database: "default",
    query: `
      SELECT SUM("${pgSchema}"."Record"."amount") as totalbalance
        FROM "${pgSchema}"."Record"

        JOIN "${pgSchema}"."_RecordToUser"
        ON "${pgSchema}"."_RecordToUser"."A" = "${pgSchema}"."Record"."id"

        WHERE "${pgSchema}"."_RecordToUser"."B" = '${userId}'
        AND "${pgSchema}"."Record"."date" <= '${dateISO}'

    `
  }

  return context.prisma.$graphql(mutation, variaveis)
    .then(response => {
      const totalBalance = response.executeRaw[0].totalbalance
      return totalBalance ? totalBalance : 0
    })
}

function records(parent, { month, type, accountsIds, categoriesIds }, context, info) {
  const userId = getUserId(context)

  let AND = [{ user: { id: userId } }]
  AND = !type ? AND : [...AND, { type }]

  AND = !accountsIds || accountsIds.length === 0 ? AND : [...AND, { OR: accountsIds.map(id => ({ account: { id } })) }]

  AND = !categoriesIds || categoriesIds.length === 0 ? AND : [...AND, { OR: categoriesIds.map(id => ({ category: { id } })) }]

  if(month){
    const date = moment(month, "MM-YYYY") // 06-2020
    const startDate = date.startOf("month").toISOString() // 01-06-2020T:00:00:0000Z
    const endDate = date.endOf("month").toISOString() // 31-06-2020T:23:59:9999Z

    AND = [...AND, { date_gte: startDate }, { date_lte: endDate }]

  }

  return context.db.query.records({
    where: { AND },
    orderBy: "date_ASC"
  }, info)

}

function user(parent, args, context, info) {
  const userId = getUserId(context)
  return context.db.query.user({ where: { id: userId } }, info)
}

function accounts(parent, args, context, info) {
  const userId = getUserId(context)
  return context.db.query.accounts({
    where: {
      OR: [
        {
          user: {
            id: userId
          }
        },
        {
          user: null
        }
      ]
    },
    orderBy: "description_ASC"
  }, info)
}

function categories(parent, { operation }, context, info) {
  const userId = getUserId(context)
  let AND = [
    {
      OR: [
        { user: { id: userId } },
        { user: null }
      ]
    }
  ]

  AND = !operation ? AND : [...AND, { operation }]

  return context.db.query.categories({
    where: { AND },
    orderBy: "description_ASC"
  }, info)
}

module.exports = {
  user,
  accounts,
  categories,
  records,
  totalBalance
}