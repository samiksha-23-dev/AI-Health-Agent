pipeline {
    agent any

    environment {
        AWS_REGION     = "us-east-1"
        ECR_ACCOUNT    = "633193633631.dkr.ecr.us-east-1.amazonaws.com"
        BACKEND_IMAGE  = "healthai-backend"
        FRONTEND_IMAGE = "healthai-frontend"
    }

    stages {

        stage('Prepare Workspace') {
            steps {
                sh '''
                rm -rf *
                cp -r /opt/project/* .
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    sh '''
                    aws ecr get-login-password --region $AWS_REGION \
                    | docker login --username AWS --password-stdin $ECR_ACCOUNT
                    '''
                }
            }
        }

        stage('Build & Push Backend') {
            steps {
                sh '''
                cd backend
                docker build -t $BACKEND_IMAGE:latest .
                docker tag $BACKEND_IMAGE:latest $ECR_ACCOUNT/$BACKEND_IMAGE:latest
                docker push $ECR_ACCOUNT/$BACKEND_IMAGE:latest
                '''
            }
        }

        stage('Build & Push Frontend') {
            steps {
                sh '''
                cd frontend
                docker build -t $FRONTEND_IMAGE:latest .
                docker tag $FRONTEND_IMAGE:latest $ECR_ACCOUNT/$FRONTEND_IMAGE:latest
                docker push $ECR_ACCOUNT/$FRONTEND_IMAGE:latest
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                kubectl apply -f k8s/backend-deployment.yaml
                kubectl apply -f k8s/frontend-deployment.yaml
                kubectl rollout status deployment/healthai-backend
                kubectl rollout status deployment/healthai-frontend
                '''
            }
        }
    }
}
