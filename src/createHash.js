const bcrypt = require('bcrypt')

const args = process.argv.slice(2)

if (args.length > 0) {
  ;(async () => console.log(await bcrypt.hash(args[0], 10)))()
} else {
  console.error('Too few arguments')
}
