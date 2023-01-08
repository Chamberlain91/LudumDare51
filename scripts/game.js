function detectCluster(grid, x, y, equal) {

    const type = grid[y][x]
    if (type == undefined)
        return []

    const visited = []
    const output = []
    const frontier = [
        [x, y]
    ]

    const getCell = (x, y) => {
        if (y < 0 || y >= grid.length) { return undefined }
        if (x < 0 || x >= grid[0].length) { return undefined }
        return grid[y][x]
    }

    const isVisited = (x1, y1) => {
        const isPointEqual = ([x2, y2]) => x1 == x2 && y1 == y2
        return visited.find(isPointEqual) != undefined
    }

    let counter = 0
    while (frontier.length > 0) {

        // if (counter++ > 200) {
        //     throw new Error("INFLOOP")
        // }

        // Get the next point to search
        const [x, y] = frontier.shift()

        // Have we visited this point before?
        if (isVisited(x, y) == false) {

            // Add to our output set
            visited.push([x, y])
            output.push([x, y])

            // Get neighbor cells
            let xneg = getCell(x - 1, y)
            let xpos = getCell(x + 1, y)
            let yneg = getCell(x, y - 1)
            let ypos = getCell(x, y + 1)

            // ...
            if (xneg !== undefined && equal(xneg, type)) frontier.push([x - 1, y])
            if (xpos !== undefined && equal(xpos, type)) frontier.push([x + 1, y])
            if (yneg !== undefined && equal(yneg, type)) frontier.push([x, y - 1])
            if (ypos !== undefined && equal(ypos, type)) frontier.push([x, y + 1])
        }
    }

    output.reverse()
    return output
}

class CoroutineRunner {

    constructor() {
        this.coroutines = []
    }

    update(dt) {

        for (let i = 0; i < this.coroutines.length; i++) {

            const state = this.coroutines[i]

            if (state.delay <= 0) {

                const generator = state.generators[state.generators.length - 1]

                const result = generator.next()
                if (result.done) {
                    state.generators.pop()
                    if (state.generators.length == 0) {
                        this.coroutines.splice(i, 1)
                    }
                }

                if (result.value == null || result.value == undefined) {
                    // assume null means wait next frame
                    return
                }
                else if (typeof result.value == "number") {
                    // assume number means delay
                    state.delay = result.value
                }
                else {
                    // assume generator function
                    state.generators.push(result.value)
                }

            } else {
                // Currently delaying
                state.delay -= dt
            }
        }
    }

    begin(coroutine) {
        this.coroutines.push({
            generators: [coroutine()],
            delay: 0,
        })
    }
}

export {
    CoroutineRunner,
    detectCluster
}