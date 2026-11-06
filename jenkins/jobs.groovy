
folder('SportClub-Tests') {
    description('SportClub QA Challenge - Pipelines de automatización.')
}

def suites = [
    [id: '01-Backend-API',  file: 'backend-api.jenkinsfile',  description: 'API Testing - Newman'],
    [id: '02-Web-Unit',     file: 'web-unit.jenkinsfile',     description: 'Web Unit Testing - Vitest'],
    [id: '03-Mobile-Unit',  file: 'mobile-unit.jenkinsfile',  description: 'Mobile Unit Testing - Vitest'],
    [id: '04-Web-E2E',      file: 'web-e2e.jenkinsfile',      description: 'Web E2E Testing - Playwright'],
    [id: '05-Mobile-E2E',   file: 'mobile-e2e.jenkinsfile',   description: 'Mobile E2E Testing - Maestro'],
    [id: '06-Performance',  file: 'performance.jenkinsfile', description: 'Performance Testing - JMeter']
]

suites.each { suite ->

    def pipelineScript = """
        properties([
            disableConcurrentBuilds(),
            buildDiscarder(logRotator(
                numToKeepStr: '20',
                artifactNumToKeepStr: '10'
            ))
        ])

        node {
            dir(env.PROJECT_ROOT) {
                load 'jenkins/pipelines/${suite.file}'
            }
        }
    """.stripIndent()

    pipelineJob("SportClub-Tests/${suite.id}") {
        description(suite.description)

        definition {
            cps {
                script(pipelineScript)
                sandbox(true)
            }
        }
    }
}

def fullSuiteScript = '''
properties([
    disableConcurrentBuilds(),
    buildDiscarder(logRotator(
        numToKeepStr: '20',
        artifactNumToKeepStr: '10'
    ))
])

def suites = [
    '01-Backend-API',
    '02-Web-Unit',
    '03-Mobile-Unit',
    '04-Web-E2E',
    '05-Mobile-E2E',
    '06-Performance'
]

def failures = []

timestamps {
    timeout(time: 180, unit: 'MINUTES') {

        for (String suite : suites) {
            stage(suite) {

                def result = build(
                    job: "/SportClub-Tests/${suite}",
                    wait: true,
                    propagate: false
                )

                echo "${suite}: ${result.result}"

                if (result.result != 'SUCCESS') {
                    failures.add(suite)
                }
            }
        }
    }
}

if (!failures.isEmpty()) {
    error("Suites fallidas: ${failures.join(', ')}")
}

echo 'Todas las pruebas finalizaron correctamente.'
'''.stripIndent()

pipelineJob('SportClub-Tests/00-Full-Suite') {
    description('Ejecuta todos los pipelines de automatización.')

    definition {
        cps {
            script(fullSuiteScript)
            sandbox(true)
        }
    }
}
